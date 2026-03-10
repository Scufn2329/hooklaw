import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type McpServer, type McpHealthResult } from '../api/client.ts';

// ── Constants ────────────────────────────────────────────────

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic', hint: 'Claude models', favicon: 'https://anthropic.com/favicon.ico' },
  { value: 'openai', label: 'OpenAI', hint: 'GPT models', favicon: 'https://openai.com/favicon.ico' },
  { value: 'openrouter', label: 'OpenRouter', hint: 'Multi-provider gateway', favicon: 'https://openrouter.ai/favicon.ico' },
  { value: 'ollama', label: 'Ollama', hint: 'Local models, no API key', favicon: 'https://ollama.com/public/ollama.png' },
];

const MODELS: Record<string, Array<{ value: string; label: string; hint?: string }>> = {
  anthropic: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'Best balance' },
    { value: 'claude-opus-4-6', label: 'Claude Opus 4.6', hint: 'Most capable' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', hint: 'Fastest & cheapest' },
  ],
  openai: [
    { value: 'gpt-5.4', label: 'GPT-5.4', hint: 'Latest flagship' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', hint: 'Fast & capable' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano', hint: 'Ultra-light & cheap' },
    { value: 'o4-mini', label: 'o4-mini', hint: 'Reasoning' },
  ],
  openrouter: [
    { value: 'openai/gpt-5.4', label: 'GPT-5.4', hint: 'Latest' },
    { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'openrouter/auto', label: 'Auto Router', hint: 'Best for task' },
  ],
  ollama: [
    { value: 'llama4', label: 'Llama 4', hint: 'Scout 109B MoE' },
    { value: 'qwen3', label: 'Qwen 3', hint: '235B MoE' },
    { value: 'deepseek-r1', label: 'DeepSeek R1', hint: 'Reasoning' },
    { value: 'llama3.3', label: 'Llama 3.3', hint: '70B' },
    { value: 'gemma3', label: 'Gemma 3', hint: 'Google' },
  ],
};

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
  openrouter: 'openai/gpt-5.4',
  ollama: 'llama4',
};

interface McpConfig {
  command: string;
  args: string[];
}

interface UseCase {
  id: string;
  label: string;
  hint: string;
  description: string;
  category: 'mcp' | 'general';
  slug: string;
  mode: 'sync' | 'async';
  instructions: string;
  mcp?: { name: string; config: McpConfig };
  tools?: string[];
  favicon?: string;
}

const USE_CASES: UseCase[] = [
  {
    id: 'stripe', label: 'Stripe', hint: 'Process payments, refunds', description: 'Process Stripe payment events',
    category: 'mcp', favicon: 'https://stripe.com/favicon.ico', slug: 'stripe', mode: 'async',
    mcp: { name: 'stripe', config: { command: 'npx', args: ['-y', '@stripe/agent-toolkit', '--api-key', '${STRIPE_SECRET_KEY}'] } },
    tools: ['stripe'],
    instructions: `You handle Stripe webhook events. Based on the event type:\n- payment_intent.succeeded: Confirm the payment and log details\n- customer.subscription.updated: Check the new status and take action\n- charge.refunded: Log the refund and notify if needed\nUse Stripe tools to look up additional details when needed. Be concise.`,
  },
  {
    id: 'github', label: 'GitHub', hint: 'React to PRs, issues, pushes', description: 'React to GitHub events',
    category: 'mcp', favicon: 'https://github.com/favicon.ico', slug: 'github', mode: 'async',
    mcp: { name: 'github', config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } },
    tools: ['github'],
    instructions: `You handle GitHub webhook events. Based on the event:\n- Pull requests: Review the changes, add labels, or leave comments\n- Issues: Triage by priority, add labels, assign if appropriate\n- Pushes: Summarize what changed\nUse GitHub tools to interact with repos. Be helpful and concise.`,
  },
  {
    id: 'slack', label: 'Slack', hint: 'Send messages, create channels', description: 'Send Slack notifications',
    category: 'mcp', favicon: 'https://slack.com/favicon.ico', slug: 'slack-notify', mode: 'async',
    mcp: { name: 'slack', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-slack'] } },
    tools: ['slack'],
    instructions: `You receive events and send notifications to Slack. Format messages clearly with:\n- A short title describing what happened\n- Key details in bullet points\n- Any action needed\nUse Slack tools to post messages to the appropriate channel.`,
  },
  {
    id: 'linear', label: 'Linear', hint: 'Create issues, update projects', description: 'Manage Linear issues',
    category: 'mcp', favicon: 'https://linear.app/favicon.ico', slug: 'linear', mode: 'async',
    mcp: { name: 'linear', config: { command: 'npx', args: ['-y', 'mcp-linear'] } },
    tools: ['linear'],
    instructions: `You receive events and manage Linear issues. Based on the data:\n- Create new issues with appropriate titles, descriptions, and priority\n- Update existing issues when new information arrives\nUse Linear tools to interact with projects.`,
  },
  {
    id: 'notion', label: 'Notion', hint: 'Create pages, update databases', description: 'Log events to Notion',
    category: 'mcp', favicon: 'https://www.notion.so/images/favicon.ico', slug: 'notion', mode: 'async',
    mcp: { name: 'notion', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-notion'] } },
    tools: ['notion'],
    instructions: `You receive events and log them in Notion. For each event:\n- Create or update a page in the appropriate database\n- Include all relevant details in a structured format\nUse Notion tools to manage pages and databases.`,
  },
  {
    id: 'postgres', label: 'PostgreSQL', hint: 'Query and update databases', description: 'Query PostgreSQL',
    category: 'mcp', favicon: 'https://www.postgresql.org/favicon.ico', slug: 'db-webhook', mode: 'sync',
    mcp: { name: 'postgres', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-postgres', '${DATABASE_URL}'] } },
    tools: ['postgres'],
    instructions: `You receive events and interact with the database. Based on the payload:\n- Query relevant records for context\n- Insert or update records as needed\nUse PostgreSQL tools to execute queries. Always use parameterized queries.`,
  },
  {
    id: 'summarize', label: 'Summarize & respond', hint: 'Analyze payload, return summary',
    description: 'Summarize payloads and respond', category: 'general', slug: 'summarize', mode: 'sync',
    instructions: `You receive event payloads. Analyze the data and respond with a concise, actionable summary. Be direct — max 3 sentences.`,
  },
  {
    id: 'triage', label: 'Triage & classify', hint: 'Categorize events by priority',
    description: 'Classify and prioritize events', category: 'general', slug: 'triage', mode: 'sync',
    instructions: `You receive event payloads. Classify the event by type and priority (critical/high/medium/low). Respond with: category, priority, and a one-line reason.`,
  },
  {
    id: 'custom', label: 'Custom', hint: 'Write your own instructions from scratch',
    description: '', category: 'general', slug: 'my-hook', mode: 'async', instructions: '',
  },
];

// ── Types ────────────────────────────────────────────────────

type HookType = '' | 'webhook' | 'rss';

interface FormData {
  hookType: HookType;
  // RSS-specific
  feedUrl: string;
  feedRefresh: number;
  // Common
  slug: string;
  description: string;
  // Use case + Agent
  useCase: string;
  provider: string;
  model: string;
  mode: 'async' | 'sync';
  instructions: string;
  mcp?: { name: string; config: McpConfig };
  tools: string[];
}

const STEPS = ['Hook', 'Recipe', 'Agent', 'Review'] as const;

// ── Component ────────────────────────────────────────────────

export function CreateRecipe() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>({
    hookType: '',
    feedUrl: '',
    feedRefresh: 300000,
    slug: '',
    description: '',
    useCase: '',
    provider: '',
    model: '',
    mode: 'async',
    instructions: '',
    tools: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // MCP servers from backend
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpHealth, setMcpHealth] = useState<Map<string, McpHealthResult>>(new Map());
  const [mcpLoading, setMcpLoading] = useState(false);

  // Load MCPs when entering Agent step
  useEffect(() => {
    if (step === 2 && mcpServers.length === 0 && !mcpLoading) {
      setMcpLoading(true);
      Promise.all([
        api.getMcpServers(),
        api.checkAllMcpHealth().catch(() => ({ servers: [] })),
      ]).then(([serversRes, healthRes]) => {
        setMcpServers(serversRes.servers);
        const healthMap = new Map<string, McpHealthResult>();
        for (const h of healthRes.servers) healthMap.set(h.name, h);
        setMcpHealth(healthMap);
      }).catch(() => {})
        .finally(() => setMcpLoading(false));
    }
  }, [step]);

  function update(fields: Partial<FormData>) {
    setData((d) => ({ ...d, ...fields }));
  }

  function recipeId() {
    return data.slug.replace(/[^a-z0-9-]/g, '') || 'my-hook';
  }

  async function handleCreate() {
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        id: recipeId(),
        description: data.description,
        slug: data.slug,
        mode: data.mode,
        provider: data.provider,
        model: data.model,
        instructions: data.instructions,
        tools: data.tools,
      };
      if (data.mcp) body.mcp = data.mcp;
      if (data.hookType === 'rss' && data.feedUrl) {
        body.feed = {
          url: data.feedUrl,
          refresh: data.feedRefresh,
          skip_initial: true,
        };
      }

      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      navigate('/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const canContinueStep0 = data.hookType === 'webhook' ? !!data.slug : (data.hookType === 'rss' && !!data.feedUrl && !!data.slug);
  const canContinueStep1 = !!data.useCase && !!data.slug;
  const canContinueStep2 = !!data.provider && !!data.model;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate('/recipes')} className="text-zinc-500 hover:text-zinc-300 text-sm mb-4 inline-flex items-center gap-1 transition-colors">
          ← Back to Recipes
        </button>
        <h1 className="text-2xl font-bold text-zinc-100">Create Hook</h1>
        <p className="text-sm text-zinc-500 mt-1">Set up a new event source and connect it to an AI recipe.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => { if (i < step) setStep(i); }}
              disabled={i > step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-emerald-600 text-white cursor-pointer hover:bg-emerald-500' :
                i === step ? 'bg-emerald-600/20 text-emerald-400 ring-2 ring-emerald-600' :
                'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </button>
            <span className={`text-xs hidden sm:inline ${i === step ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-600' : 'bg-zinc-700'}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">

        {/* ── Step 0: Choose Hook Type ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Choose your event source</h2>
              <p className="text-sm text-zinc-500 mt-1">How will events reach HookLaw?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update({ hookType: 'webhook' })}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                  data.hookType === 'webhook'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                    : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  data.hookType === 'webhook' ? 'bg-blue-500/15' : 'bg-zinc-800'
                }`}>
                  <WebhookSvg className={data.hookType === 'webhook' ? 'text-blue-400' : 'text-zinc-400'} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${data.hookType === 'webhook' ? 'text-blue-400' : 'text-zinc-200'}`}>Webhook</p>
                  <p className="text-xs text-zinc-500 mt-0.5">HTTP POST endpoint</p>
                </div>
              </button>

              <button
                onClick={() => update({ hookType: 'rss' })}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                  data.hookType === 'rss'
                    ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                    : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  data.hookType === 'rss' ? 'bg-amber-500/15' : 'bg-zinc-800'
                }`}>
                  <RssSvg className={data.hookType === 'rss' ? 'text-amber-400' : 'text-zinc-400'} />
                </div>
                <div className="text-center">
                  <p className={`text-sm font-medium ${data.hookType === 'rss' ? 'text-amber-400' : 'text-zinc-200'}`}>RSS Feed</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Poll RSS/Atom feeds</p>
                </div>
              </button>
            </div>

            {/* Webhook config */}
            {data.hookType === 'webhook' && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Webhook slug</label>
                  <div className="flex items-center">
                    <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 text-sm px-3 py-2 rounded-l-lg whitespace-nowrap">POST /h/</span>
                    <input
                      value={data.slug}
                      onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="my-webhook"
                      className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">External services will POST to this URL.</p>
                </div>
              </div>
            )}

            {/* RSS config */}
            {data.hookType === 'rss' && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Feed URL</label>
                  <input
                    value={data.feedUrl}
                    onChange={(e) => update({ feedUrl: e.target.value })}
                    placeholder="https://example.com/feed.xml"
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Poll interval</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 60000, label: '1 min' },
                      { value: 300000, label: '5 min' },
                      { value: 900000, label: '15 min' },
                      { value: 3600000, label: '1 hour' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update({ feedRefresh: opt.value })}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                          data.feedRefresh === opt.value
                            ? 'border-emerald-600 bg-emerald-600/10 text-emerald-400'
                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50 text-zinc-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Internal slug</label>
                  <div className="flex items-center">
                    <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 text-sm px-3 py-2 rounded-l-lg whitespace-nowrap">slug:</span>
                    <input
                      value={data.slug}
                      onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      placeholder="my-feed"
                      className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">Feed items are routed to recipes matching this slug.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(1)}
                disabled={!canContinueStep0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Choose Use Case ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {data.hookType === 'rss' ? 'What should happen when a new item arrives?' : 'What should happen when a webhook arrives?'}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">Pick a template or start from scratch.</p>
            </div>

            {/* MCP Integrations */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Integrations (MCP)</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {USE_CASES.filter(uc => uc.category === 'mcp').map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => update({
                      useCase: uc.id,
                      description: uc.description,
                      mode: uc.mode,
                      instructions: uc.instructions,
                      mcp: uc.mcp,
                      tools: uc.tools ?? [],
                      slug: data.slug || uc.slug,
                    })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      data.useCase === uc.id
                        ? 'border-emerald-600 bg-emerald-600/10 ring-1 ring-emerald-600/50'
                        : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      data.useCase === uc.id ? 'bg-emerald-600/10' : 'bg-zinc-800'
                    }`}>
                      {uc.favicon
                        ? <img src={uc.favicon} alt={uc.label} className={`w-6 h-6 ${uc.id === 'github' ? 'invert' : ''}`} />
                        : <span className="text-lg">{uc.label[0]}</span>
                      }
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      data.useCase === uc.id ? 'text-emerald-400' : 'text-zinc-300'
                    }`}>{uc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* General */}
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">General</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {USE_CASES.filter(uc => uc.category === 'general').map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => update({
                      useCase: uc.id,
                      description: uc.description,
                      mode: uc.mode,
                      instructions: uc.instructions,
                      mcp: undefined,
                      tools: [],
                      slug: data.slug || uc.slug,
                    })}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      data.useCase === uc.id
                        ? 'border-emerald-600 bg-emerald-600/10 ring-1 ring-emerald-600/50'
                        : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30 hover:bg-zinc-800/60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                      data.useCase === uc.id ? 'bg-emerald-600/10' : 'bg-zinc-800'
                    }`}>
                      {uc.id === 'summarize' ? '📋' : uc.id === 'triage' ? '🏷️' : '⚙️'}
                    </div>
                    <span className={`text-xs font-medium text-center leading-tight ${
                      data.useCase === uc.id ? 'text-emerald-400' : 'text-zinc-300'
                    }`}>{uc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customize after selection */}
            {data.useCase && (
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Recipe title</label>
                  <input
                    value={data.description}
                    onChange={(e) => update({ description: e.target.value })}
                    placeholder="e.g. Process Stripe payment events"
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                </div>

                {/* Mode */}
                <div>
                  <label className="text-sm text-zinc-300 block mb-1">Processing mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sync', 'async'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => update({ mode: m })}
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          data.mode === m
                            ? 'border-emerald-600 bg-emerald-600/10'
                            : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                        }`}
                      >
                        <p className={`text-sm font-medium ${data.mode === m ? 'text-emerald-400' : 'text-zinc-200'}`}>
                          {m === 'sync' ? 'Sync' : 'Async'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {m === 'sync' ? 'Wait for AI response' : 'Process in background'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(0)} className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canContinueStep1}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Agent Config ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Configure the AI agent</h2>
              <p className="text-sm text-zinc-500 mt-1">Choose the provider, model, and instructions.</p>
            </div>

            {/* Provider */}
            <div className="grid gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => update({ provider: p.value, model: DEFAULT_MODELS[p.value] })}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    data.provider === p.value
                      ? 'border-emerald-600 bg-emerald-600/10'
                      : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                  }`}
                >
                  <img src={p.favicon} alt={p.label} className={`w-5 h-5 rounded ${p.value === 'ollama' ? 'bg-white p-0.5' : ''}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${data.provider === p.value ? 'text-emerald-400' : 'text-zinc-200'}`}>{p.label}</p>
                    <p className="text-xs text-zinc-500">{p.hint}</p>
                  </div>
                  {data.provider === p.value && <span className="text-emerald-400 text-sm">✓</span>}
                </button>
              ))}
            </div>

            {/* Model */}
            {data.provider && (
              <div>
                <label className="text-sm text-zinc-300 block mb-1.5">Model</label>
                <div className="grid gap-1.5">
                  {(MODELS[data.provider] ?? []).map((m) => (
                    <button
                      key={m.value}
                      onClick={() => update({ model: m.value })}
                      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                        data.model === m.value
                          ? 'border-emerald-600 bg-emerald-600/10'
                          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${data.model === m.value ? 'text-emerald-400' : 'text-zinc-200'}`}>{m.label}</span>
                        {m.hint && <span className="text-xs text-zinc-500">{m.hint}</span>}
                      </div>
                      {data.model === m.value && <span className="text-emerald-400 text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {data.provider && (
              <div>
                <label className="text-sm text-zinc-300 block mb-1">Agent instructions</label>
                <textarea
                  value={data.instructions}
                  onChange={(e) => update({ instructions: e.target.value })}
                  rows={5}
                  placeholder="Tell the AI what to do with incoming events..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none"
                />
              </div>
            )}

            {/* MCP Tools */}
            {data.provider && (
              <div>
                <label className="text-sm text-zinc-300 block mb-1.5">MCP Tools <span className="text-zinc-600 text-xs">(optional)</span></label>
                {mcpLoading ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs p-3">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                    Loading MCP servers...
                  </div>
                ) : mcpServers.length === 0 && data.tools.length === 0 ? (
                  <p className="text-xs text-zinc-600 bg-zinc-800/30 rounded-lg p-3">No MCP servers configured. You can add them later in hooklaw.config.yaml.</p>
                ) : (
                  <div className="grid gap-1.5">
                    {/* Template MCP (from use case) shown first if not in server list */}
                    {data.mcp && !mcpServers.find((s) => s.name === data.mcp?.name) && (
                      <McpToggle
                        name={data.mcp.name}
                        hint="From template"
                        status="connected"
                        toolCount={0}
                        selected={data.tools.includes(data.mcp.name)}
                        onToggle={() => {
                          const tools = data.tools.includes(data.mcp!.name)
                            ? data.tools.filter((t) => t !== data.mcp!.name)
                            : [...data.tools, data.mcp!.name];
                          update({ tools });
                        }}
                      />
                    )}
                    {mcpServers.map((server) => {
                      const health = mcpHealth.get(server.name);
                      return (
                        <McpToggle
                          key={server.name}
                          name={server.name}
                          hint={server.packageName ?? server.command ?? server.transport}
                          status={health?.status}
                          toolCount={health?.tools?.length ?? 0}
                          selected={data.tools.includes(server.name)}
                          onToggle={() => {
                            const tools = data.tools.includes(server.name)
                              ? data.tools.filter((t) => t !== server.name)
                              : [...data.tools, server.name];
                            update({ tools });
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(1)} className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!canContinueStep2}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Review & Create</h2>
              <p className="text-sm text-zinc-500 mt-1">Everything look good?</p>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Source" value={data.hookType === 'rss' ? 'RSS Feed' : 'Webhook'} badge={data.hookType === 'rss' ? 'amber' : 'blue'} />
              {data.hookType === 'webhook' && (
                <Row label="Endpoint" value={`POST /h/${data.slug}`} mono highlight />
              )}
              {data.hookType === 'rss' && (
                <>
                  <Row label="Feed URL" value={data.feedUrl} mono />
                  <Row label="Poll interval" value={formatRefresh(data.feedRefresh)} />
                  <Row label="Slug" value={data.slug} mono highlight />
                </>
              )}
              <Row label="Recipe" value={data.description || recipeId()} />
              <Row label="Provider" value={PROVIDERS.find(p => p.value === data.provider)?.label ?? data.provider} />
              <Row label="Model" value={data.model} mono />
              <Row label="Mode" value={data.mode} />
              {data.mcp && <Row label="MCP Server" value={data.mcp.name} mono />}
              {data.tools.length > 0 && <Row label="Tools" value={data.tools.join(', ')} mono />}
            </div>

            {data.instructions && (
              <div>
                <p className="text-xs text-zinc-500 mb-1">Agent instructions</p>
                <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">{data.instructions}</pre>
              </div>
            )}

            {error && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button onClick={() => setStep(2)} className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                {saving ? 'Creating...' : 'Create Hook'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function Row({ label, value, mono, highlight, badge }: {
  label: string; value: string; mono?: boolean; highlight?: boolean; badge?: 'amber' | 'blue';
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500">{label}</span>
      {badge ? (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${
          badge === 'amber'
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        }`}>{value}</span>
      ) : (
        <span className={`${mono ? 'font-mono text-xs' : ''} ${highlight ? 'text-emerald-400' : 'text-zinc-200'} truncate max-w-[60%] text-right`}>{value}</span>
      )}
    </div>
  );
}

function formatRefresh(ms: number): string {
  if (ms < 60000) return `${ms / 1000}s`;
  if (ms < 3600000) return `${ms / 60000} min`;
  return `${ms / 3600000} hour${ms > 3600000 ? 's' : ''}`;
}

// ── MCP Toggle ───────────────────────────────────────────────

function McpToggle({ name, hint, status, toolCount, selected, onToggle }: {
  name: string;
  hint?: string;
  status?: string;
  toolCount: number;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
        selected
          ? 'border-purple-500 bg-purple-500/10'
          : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
      }`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        selected ? 'border-purple-500 bg-purple-500' : 'border-zinc-600'
      }`}>
        {selected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${selected ? 'text-purple-400' : 'text-zinc-200'}`}>{name}</span>
          {status === 'connected' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          {status === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          {status === 'not_installed' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
        </div>
        <p className="text-[11px] text-zinc-500 truncate">{hint}{toolCount > 0 ? ` · ${toolCount} tools` : ''}</p>
      </div>
    </button>
  );
}

// ── SVG Icons ────────────────────────────────────────────────

function WebhookSvg({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function RssSvg({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 11a9 9 0 019 9" />
      <path d="M4 4a16 16 0 0116 16" />
      <circle cx="5" cy="19" r="1" />
    </svg>
  );
}
