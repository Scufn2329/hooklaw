import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { createLogger } from './logger.js';
import type { FeedSourceConfig } from './types.js';

const logger = createLogger('hooklaw:feeds');

// ── Types ────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  title: string;
  link: string;
  content: string;
  summary: string;
  date: string | null;
  author: string;
  categories: string[];
}

export interface FeedsDeps {
  processWebhook: (slug: string, payload: unknown) => Promise<string | void>;
}

export interface FeedManager {
  destroy: () => void;
  getStatus: () => FeedStatus[];
}

export interface FeedStatus {
  id: string;
  url: string;
  slug: string;
  refresh: number;
  enabled: boolean;
}

// ── RSS/Atom Parsing ─────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function parseItems(xml: string, feedUrl: string): FeedItem[] {
  const doc = xmlParser.parse(xml);

  // RSS 2.0
  const channel = doc?.rss?.channel;
  if (channel) {
    const rawItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return rawItems.map((item: Record<string, unknown>) => ({
      id: String(item.guid ?? item.link ?? item.title ?? ''),
      title: String(item.title ?? ''),
      link: String(item.link ?? ''),
      content: String(item['content:encoded'] ?? item.description ?? ''),
      summary: String(item.description ?? ''),
      date: item.pubDate ? String(item.pubDate) : null,
      author: String(item.author ?? item['dc:creator'] ?? ''),
      categories: Array.isArray(item.category) ? item.category.map(String) : item.category ? [String(item.category)] : [],
    }));
  }

  // Atom
  const feed = doc?.feed;
  if (feed) {
    const rawEntries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
    return rawEntries.map((entry: Record<string, unknown>) => {
      const link = Array.isArray(entry.link)
        ? (entry.link as Record<string, string>[]).find((l) => l['@_rel'] === 'alternate')?.['@_href'] ?? (entry.link as Record<string, string>[])[0]?.['@_href'] ?? ''
        : typeof entry.link === 'object' && entry.link ? (entry.link as Record<string, string>)['@_href'] ?? '' : String(entry.link ?? '');
      const content = typeof entry.content === 'object' && entry.content ? (entry.content as Record<string, string>)['#text'] ?? '' : String(entry.content ?? '');
      return {
        id: String(entry.id ?? link ?? entry.title ?? ''),
        title: String(entry.title ?? ''),
        link,
        content,
        summary: String(entry.summary ?? ''),
        date: entry.updated ? String(entry.updated) : entry.published ? String(entry.published) : null,
        author: typeof entry.author === 'object' && entry.author ? String((entry.author as Record<string, string>).name ?? '') : String(entry.author ?? ''),
        categories: Array.isArray(entry.category)
          ? (entry.category as Record<string, string>[]).map((c) => c['@_term'] ?? String(c))
          : entry.category ? [typeof entry.category === 'object' ? (entry.category as Record<string, string>)['@_term'] ?? '' : String(entry.category)] : [],
      };
    });
  }

  return [];
}

function contentHash(item: FeedItem): string {
  return createHash('sha256')
    .update(`${item.title}\0${item.content}\0${item.summary}`)
    .digest('hex')
    .slice(0, 16);
}

// ── Poller ────────────────────────────────────────────────────

interface PollerState {
  seenIds: Set<string>;
  contentHashes: Map<string, string>; // id → hash
  etag?: string;
  lastModified?: string;
  isFirstPoll: boolean;
}

async function poll(
  feedUrl: string,
  state: PollerState,
  onNewItem: (item: FeedItem) => void,
  onUpdatedItem: (item: FeedItem) => void,
): Promise<void> {
  const headers: Record<string, string> = {
    'User-Agent': 'hooklaw/2.0',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
  };
  if (state.etag) headers['If-None-Match'] = state.etag;
  if (state.lastModified) headers['If-Modified-Since'] = state.lastModified;

  const res = await fetch(feedUrl, { headers, signal: AbortSignal.timeout(15_000) });

  if (res.status === 304) return; // not modified
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${res.statusText}`);

  state.etag = res.headers.get('etag') ?? undefined;
  state.lastModified = res.headers.get('last-modified') ?? undefined;

  const xml = await res.text();
  const items = parseItems(xml, feedUrl);

  // On first poll, just seed the seen set (don't emit)
  if (state.isFirstPoll) {
    for (const item of items) {
      state.seenIds.add(item.id);
      state.contentHashes.set(item.id, contentHash(item));
    }
    state.isFirstPoll = false;
    return;
  }

  for (const item of items) {
    const hash = contentHash(item);
    if (!state.seenIds.has(item.id)) {
      state.seenIds.add(item.id);
      state.contentHashes.set(item.id, hash);
      onNewItem(item);
    } else {
      const prevHash = state.contentHashes.get(item.id);
      if (prevHash && prevHash !== hash) {
        state.contentHashes.set(item.id, hash);
        onUpdatedItem(item);
      }
    }
  }
}

// ── Feed Manager ─────────────────────────────────────────────

function feedItemToPayload(feedId: string, feedUrl: string, item: FeedItem) {
  return {
    source: 'rss',
    feed_id: feedId,
    feed_url: feedUrl,
    item: {
      id: item.id,
      title: item.title,
      link: item.link,
      content: item.content,
      summary: item.summary,
      date: item.date,
      author: item.author,
      categories: item.categories,
    },
  };
}

export function startFeeds(
  feeds: Record<string, FeedSourceConfig>,
  deps: FeedsDeps,
): FeedManager {
  const entries = Object.entries(feeds).filter(([, f]) => f.enabled);
  const timers: ReturnType<typeof setInterval>[] = [];

  if (entries.length === 0) {
    logger.info('No feeds configured');
    return { destroy() {}, getStatus: () => [] };
  }

  for (const [id, feedConfig] of entries) {
    const state: PollerState = {
      seenIds: new Set(),
      contentHashes: new Map(),
      isFirstPoll: feedConfig.skip_initial,
    };

    const tick = async () => {
      try {
        await poll(
          feedConfig.url,
          state,
          (item) => {
            logger.info({ feedId: id, slug: feedConfig.slug, title: item.title }, `New feed item: "${item.title}"`);
            const payload = feedItemToPayload(id, feedConfig.url, item);
            deps.processWebhook(feedConfig.slug, payload).catch((err) => {
              logger.error({ feedId: id, slug: feedConfig.slug, err }, 'Failed to process feed item');
            });
          },
          (item) => {
            logger.debug({ feedId: id, slug: feedConfig.slug, title: item.title }, `Feed item updated: "${item.title}"`);
            const payload = { ...feedItemToPayload(id, feedConfig.url, item), updated: true };
            deps.processWebhook(feedConfig.slug, payload).catch((err) => {
              logger.error({ feedId: id, slug: feedConfig.slug, err }, 'Failed to process updated feed item');
            });
          },
        );
      } catch (err) {
        logger.error({ feedId: id, url: feedConfig.url, err }, 'Feed poll error');
      }
    };

    // Initial poll, then interval
    tick();
    const timer = setInterval(tick, feedConfig.refresh);
    timer.unref();
    timers.push(timer);

    logger.info(
      { id, url: feedConfig.url, slug: feedConfig.slug, refresh: feedConfig.refresh },
      `Feed registered: ${id} → slug "${feedConfig.slug}"`,
    );
  }

  logger.info({ count: entries.length }, `${entries.length} feed(s) active`);

  return {
    destroy() {
      for (const t of timers) clearInterval(t);
      timers.length = 0;
      logger.info('Feed watchers stopped');
    },
    getStatus() {
      return entries.map(([id, f]) => ({
        id,
        url: f.url,
        slug: f.slug,
        refresh: f.refresh,
        enabled: f.enabled,
      }));
    },
  };
}
