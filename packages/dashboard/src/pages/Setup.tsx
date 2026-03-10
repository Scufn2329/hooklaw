import { useState } from 'react';

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
    { value: 'openai/gpt-4.1', label: 'GPT-4.1' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'deepseek/deepseek-r1', label: 'DeepSeek R1', hint: 'Free' },
    { value: 'qwen/qwen3-coder-480b', label: 'Qwen3 Coder 480B', hint: 'Free' },
    { value: 'openrouter/auto', label: 'Auto Router', hint: 'Best for task' },
  ],
  ollama: [
    { value: 'llama4', label: 'Llama 4', hint: 'Scout 109B MoE' },
    { value: 'qwen3', label: 'Qwen 3', hint: '235B MoE' },
    { value: 'deepseek-r1', label: 'DeepSeek R1', hint: 'Reasoning' },
    { value: 'llama3.3', label: 'Llama 3.3', hint: '70B' },
    { value: 'gemma3', label: 'Gemma 3', hint: 'Google' },
    { value: 'mistral-small', label: 'Mistral Small 3.1', hint: '128k context' },
  ],
};

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
  openrouter: 'openai/gpt-5.4',
  ollama: 'llama4',
};

const ENV_VARS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
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
  // ── MCP Integrations ────────────────────
  {
    id: 'stripe',
    label: 'Stripe',
    hint: 'Process payments, refunds, subscriptions',
    description: 'Process Stripe payment events',
    category: 'mcp',
    favicon: 'https://stripe.com/favicon.ico',
    slug: 'stripe',
    mode: 'async',
    mcp: { name: 'stripe', config: { command: 'npx', args: ['-y', '@stripe/agent-toolkit', '--api-key', '${STRIPE_SECRET_KEY}'] } },
    tools: ['stripe'],
    instructions: `You handle Stripe webhook events. Based on the event type:\n- payment_intent.succeeded: Confirm the payment and log details\n- customer.subscription.updated: Check the new status and take action\n- charge.refunded: Log the refund and notify if needed\nUse Stripe tools to look up additional details when needed. Be concise.`,
  },
  {
    id: 'github',
    label: 'GitHub',
    hint: 'React to PRs, issues, pushes',
    description: 'React to GitHub PRs, issues and pushes',
    category: 'mcp',
    favicon: 'https://github.com/favicon.ico',
    slug: 'github',
    mode: 'async',
    mcp: { name: 'github', config: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-github'] } },
    tools: ['github'],
    instructions: `You handle GitHub webhook events. Based on the event:\n- Pull requests: Review the changes, add labels, or leave comments\n- Issues: Triage by priority, add labels, assign if appropriate\n- Pushes: Summarize what changed\nUse GitHub tools to interact with repos. Be helpful and concise.`,
  },
  {
    id: 'slack',
    label: 'Slack',
    hint: 'Send messages, create channels',
    description: 'Send Slack notifications from webhooks',
    category: 'mcp',
    favicon: 'https://slack.com/favicon.ico',
    slug: 'slack-notify',
    mode: 'async',
    mcp: { name: 'slack', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-slack'] } },
    tools: ['slack'],
    instructions: `You receive webhook events and send notifications to Slack. Format messages clearly with:\n- A short title describing what happened\n- Key details in bullet points\n- Any action needed\nUse Slack tools to post messages to the appropriate channel.`,
  },
  {
    id: 'linear',
    label: 'Linear',
    hint: 'Create issues, update projects',
    description: 'Create and manage Linear issues from webhooks',
    category: 'mcp',
    favicon: 'https://linear.app/favicon.ico',
    slug: 'linear',
    mode: 'async',
    mcp: { name: 'linear', config: { command: 'npx', args: ['-y', 'mcp-linear'] } },
    tools: ['linear'],
    instructions: `You receive webhook events and manage Linear issues. Based on the data:\n- Create new issues with appropriate titles, descriptions, and priority\n- Update existing issues when new information arrives\n- Assign to the right team based on the content\nUse Linear tools to interact with projects.`,
  },
  {
    id: 'notion',
    label: 'Notion',
    hint: 'Create pages, update databases',
    description: 'Log webhook events to Notion databases',
    category: 'mcp',
    favicon: 'https://www.notion.so/images/favicon.ico',
    slug: 'notion',
    mode: 'async',
    mcp: { name: 'notion', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-notion'] } },
    tools: ['notion'],
    instructions: `You receive webhook events and log them in Notion. For each event:\n- Create or update a page in the appropriate database\n- Include all relevant details in a structured format\n- Add tags/properties based on the event type\nUse Notion tools to manage pages and databases.`,
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    hint: 'Query and update databases',
    description: 'Query and update PostgreSQL from webhooks',
    category: 'mcp',
    favicon: 'https://www.postgresql.org/favicon.ico',
    slug: 'db-webhook',
    mode: 'sync',
    mcp: { name: 'postgres', config: { command: 'npx', args: ['-y', '@anthropic/mcp-server-postgres', '${DATABASE_URL}'] } },
    tools: ['postgres'],
    instructions: `You receive webhook events and interact with the database. Based on the payload:\n- Query relevant records for context\n- Insert or update records as needed\n- Return a summary of what was done\nUse PostgreSQL tools to execute queries. Always use parameterized queries.`,
  },
  // ── General (no MCP) ───────────────────
  {
    id: 'summarize',
    label: 'Summarize & respond',
    hint: 'Analyze payload, return summary — no integration',
    description: 'Summarize webhook payloads and respond',
    category: 'general',
    slug: 'summarize',
    mode: 'sync',
    instructions: `You receive webhook payloads. Analyze the data and respond with a concise, actionable summary. Be direct — max 3 sentences.`,
  },
  {
    id: 'triage',
    label: 'Triage & classify',
    hint: 'Categorize events by priority — no integration',
    description: 'Classify and prioritize webhook events',
    category: 'general',
    slug: 'triage',
    mode: 'sync',
    instructions: `You receive webhook payloads. Classify the event by type and priority (critical/high/medium/low). Respond with: category, priority, and a one-line reason.`,
  },
  {
    id: 'custom',
    label: 'Custom',
    hint: 'Write your own instructions from scratch',
    description: '',
    category: 'general',
    slug: 'my-webhook',
    mode: 'sync',
    instructions: '',
  },
];

type HookType = 'webhook' | 'rss';

interface SetupData {
  provider: string;
  apiKey: string;
  model: string;
  hookType: HookType;
  useCase: string;
  slug: string;
  description: string;
  instructions: string;
  mode: 'async' | 'sync';
  port: number;
  mcp?: { name: string; config: McpConfig };
  tools: string[];
  feedUrl: string;
  feedRefresh: number;
}

export function Setup() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>({
    provider: '',
    apiKey: '',
    model: '',
    hookType: 'webhook',
    useCase: '',
    slug: 'my-webhook',
    description: '',
    instructions: '',
    mode: 'sync',
    port: 3007,
    tools: [],
    feedUrl: '',
    feedRefresh: 300000,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const needsKey = data.provider !== 'ollama' && data.provider !== '';

  function updateData(fields: Partial<SetupData>) {
    setData((d) => ({ ...d, ...fields }));
  }

  async function handleFinish() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <img src="/dashboard/logo.png" alt="HookLaw" className="w-16 h-16 mx-auto rounded-xl" />
          <h1 className="text-3xl font-bold text-zinc-100">You're all set!</h1>
          <p className="text-zinc-400">HookLaw is restarting with your configuration...</p>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Provider</span>
              <span className="text-zinc-200">{data.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Model</span>
              <span className="text-zinc-200 font-mono text-xs">{data.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Source</span>
              <span className="text-zinc-200">{data.hookType === 'rss' ? 'RSS Feed' : 'Webhook'}</span>
            </div>
            {data.hookType === 'webhook' && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Webhook</span>
              <span className="text-emerald-400 font-mono text-xs">POST /h/{data.slug}</span>
            </div>
            )}
            {data.hookType === 'rss' && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Feed</span>
              <span className="text-emerald-400 font-mono text-xs truncate ml-4">{data.feedUrl}</span>
            </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Mode</span>
              <span className="text-zinc-200">{data.mode}</span>
            </div>
          </div>

          {data.hookType === 'webhook' ? (
          <div className="space-y-3">
            <p className="text-zinc-500 text-sm">Test it with:</p>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-emerald-400 text-left overflow-x-auto">
{`curl -X POST http://localhost:${data.port}/h/${data.slug} \\
  -H "Content-Type: application/json" \\
  -d '{"event": "test", "message": "Hello!"}'`}
            </pre>
          </div>
          ) : (
          <div className="space-y-2">
            <p className="text-zinc-500 text-sm">Your feed is being monitored. New items will be processed automatically.</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400">
              <span className="text-zinc-600">Polling:</span> {data.feedUrl}<br/>
              <span className="text-zinc-600">Every:</span> {Math.round(data.feedRefresh / 60000)} min
            </div>
          </div>
          )}

          <button
            onClick={() => window.location.href = '/dashboard/'}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-4 pt-12 pb-12 overflow-y-auto">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src="/dashboard/logo.png" alt="HookLaw" className="w-14 h-14 mx-auto rounded-xl" />
          <h1 className="text-2xl font-bold text-zinc-100">Welcome to HookLaw</h1>
          <p className="text-zinc-500 text-sm">Webhook orchestrator with AI agents & MCP tools</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          {['Provider', 'Source & Recipe', 'Review'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step ? 'bg-emerald-600 text-white' :
                i === step ? 'bg-emerald-600/20 text-emerald-400 ring-2 ring-emerald-600' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? 'text-zinc-200' : 'text-zinc-500'}`}>{label}</span>
              {i < 2 && <div className={`w-8 h-px ${i < step ? 'bg-emerald-600' : 'bg-zinc-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          {/* Step 0: Provider */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Choose your AI provider</h2>
                <p className="text-sm text-zinc-500 mt-1">This powers the AI agent that processes your webhooks.</p>
              </div>

              <div className="grid gap-2">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    data-testid={`provider-${p.value}`}
                    onClick={() => {
                      updateData({ provider: p.value, model: DEFAULT_MODELS[p.value] });
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      data.provider === p.value
                        ? 'border-emerald-600 bg-emerald-600/10'
                        : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                    }`}
                  >
                    <img src={p.favicon} alt={p.label} className={`w-6 h-6 rounded ${p.value === 'ollama' ? 'bg-white p-0.5' : ''}`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${data.provider === p.value ? 'text-emerald-400' : 'text-zinc-200'}`}>{p.label}</p>
                      <p className="text-xs text-zinc-500">{p.hint}</p>
                    </div>
                    {data.provider === p.value && <span className="text-emerald-400 text-sm">✓</span>}
                  </button>
                ))}
              </div>

              {needsKey && data.provider && (
                <div className="space-y-2 pt-2">
                  <label className="text-sm text-zinc-300 block">
                    API Key <span className="text-zinc-600 text-xs">({ENV_VARS[data.provider]})</span>
                  </label>
                  <input
                    type="password"
                    value={data.apiKey}
                    onChange={(e) => updateData({ apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                  <p className="text-xs text-zinc-600">Stored locally in .env — never sent anywhere.</p>
                </div>
              )}

              {data.provider === 'ollama' && (
                <div className="bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-400 space-y-1">
                  <p>Ollama runs locally — no API key needed.</p>
                  <p>Make sure it's running: <code className="text-zinc-300">ollama serve</code></p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  data-testid="continue-provider"
                  onClick={() => setStep(1)}
                  disabled={!data.provider || (needsKey && !data.apiKey)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 1: What do you want to do? */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">How should events arrive?</h2>
                <p className="text-sm text-zinc-500 mt-1">Choose your event source, then pick a use case.</p>
              </div>

              {/* Hook type selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateData({ hookType: 'webhook' })}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    data.hookType === 'webhook'
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/50'
                      : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    data.hookType === 'webhook' ? 'bg-blue-500/15' : 'bg-zinc-800'
                  }`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={data.hookType === 'webhook' ? 'text-blue-400' : 'text-zinc-400'}>
                      <path d="M18 16.98h1a2 2 0 002-2v-1a2 2 0 00-2-2h-1M6 16.98H5a2 2 0 01-2-2v-1a2 2 0 012-2h1"/>
                      <path d="M12 2v4M12 18v4M8 6l8 12M16 6L8 18"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${data.hookType === 'webhook' ? 'text-blue-400' : 'text-zinc-200'}`}>Webhook</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Receive HTTP POST events</p>
                  </div>
                </button>

                <button
                  onClick={() => updateData({ hookType: 'rss' })}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    data.hookType === 'rss'
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                      : 'border-zinc-700/50 hover:border-zinc-600 bg-zinc-800/30'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    data.hookType === 'rss' ? 'bg-amber-500/15' : 'bg-zinc-800'
                  }`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={data.hookType === 'rss' ? 'text-amber-400' : 'text-zinc-400'}>
                      <path d="M4 11a9 9 0 019 9"/><path d="M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${data.hookType === 'rss' ? 'text-amber-400' : 'text-zinc-200'}`}>RSS Feed</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Poll RSS/Atom feeds</p>
                  </div>
                </button>
              </div>

              {/* RSS config fields */}
              {data.hookType === 'rss' && (
                <div className="space-y-3 border-t border-zinc-800 pt-3">
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Feed URL</label>
                    <input
                      value={data.feedUrl}
                      onChange={(e) => updateData({ feedUrl: e.target.value })}
                      placeholder="https://example.com/feed.xml"
                      className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-zinc-300 block mb-1">Poll interval</label>
                      <select
                        value={data.feedRefresh}
                        onChange={(e) => updateData({ feedRefresh: Number(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                      >
                        <option value={60000}>1 min</option>
                        <option value={300000}>5 min</option>
                        <option value={600000}>10 min</option>
                        <option value={1800000}>30 min</option>
                        <option value={3600000}>1 hour</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-300 block mb-1">Route slug</label>
                      <input
                        value={data.slug}
                        onChange={(e) => updateData({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="my-feed"
                        className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                      />
                      <p className="text-xs text-zinc-600 mt-1">Feed items route to recipes matching this slug.</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-zinc-200 mb-2">
                  {data.hookType === 'rss' ? 'What should happen when a new item arrives?' : 'What should happen when a webhook arrives?'}
                </h3>
                <p className="text-xs text-zinc-500 mb-3">Pick a use case — you can customize everything after.</p>
              </div>

              {/* MCP Integrations — app icon grid */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Integrations</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {USE_CASES.filter(uc => uc.category === 'mcp').map((uc) => (
                    <button
                      key={uc.id}
                      data-testid={`usecase-${uc.id}`}
                      onClick={() => {
                        updateData({
                          useCase: uc.id,
                          slug: uc.slug,
                          description: uc.description,
                          mode: uc.mode,
                          instructions: uc.instructions,
                          mcp: uc.mcp,
                          tools: uc.tools ?? [],
                        });
                      }}
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

              {/* General (no MCP) */}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">General</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {USE_CASES.filter(uc => uc.category === 'general').map((uc) => (
                    <button
                      key={uc.id}
                      onClick={() => {
                        updateData({
                          useCase: uc.id,
                          slug: uc.slug,
                          description: uc.description,
                          mode: uc.mode,
                          instructions: uc.instructions,
                          mcp: undefined,
                          tools: [],
                        });
                      }}
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

              {/* Customization (shown after selecting use case) */}
              {data.useCase && (
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  {/* Description */}
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Recipe title</label>
                    <input
                      value={data.description}
                      onChange={(e) => updateData({ description: e.target.value })}
                      placeholder="e.g. Process Stripe payment events"
                      className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    />
                  </div>

                  {/* Webhook slug (only for webhook type — RSS has slug above) */}
                  {data.hookType === 'webhook' && (
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Webhook URL</label>
                    <div className="flex items-center gap-0">
                      <span className="bg-zinc-800 border border-r-0 border-zinc-700 text-zinc-500 text-sm px-3 py-2 rounded-l-lg">POST /h/</span>
                      <input
                        value={data.slug}
                        onChange={(e) => updateData({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        className="flex-1 bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                  )}

                  {/* Model */}
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Model</label>
                    <div className="grid gap-1.5">
                      {(MODELS[data.provider] ?? []).map((m) => (
                        <button
                          key={m.value}
                          onClick={() => updateData({ model: m.value })}
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

                  {/* Mode */}
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Processing mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['sync', 'async'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => updateData({ mode: m })}
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

                  {/* Instructions */}
                  <div>
                    <label className="text-sm text-zinc-300 block mb-1">Agent instructions</label>
                    <textarea
                      value={data.instructions}
                      onChange={(e) => updateData({ instructions: e.target.value })}
                      rows={4}
                      placeholder="Tell the AI what to do with incoming webhooks..."
                      className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(0)}
                  className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                  ← Back
                </button>
                <button
                  data-testid="continue-recipe"
                  onClick={() => setStep(2)}
                  disabled={!data.useCase || !data.slug || (data.hookType === 'rss' && !data.feedUrl)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Review & Launch</h2>
                <p className="text-sm text-zinc-500 mt-1">Everything look good?</p>
              </div>

              <div className="space-y-2 text-sm">
                <Row label="Provider" value={PROVIDERS.find(p => p.value === data.provider)?.label ?? data.provider} />
                <Row label="Model" value={data.model} mono />
                <Row label="API Key" value={needsKey ? (data.apiKey ? '••••••' + data.apiKey.slice(-4) : 'Not set') : 'Not needed'} />
                <Row label="Source" value={data.hookType === 'rss' ? 'RSS Feed' : 'Webhook'} />
                {data.hookType === 'webhook' && (
                  <Row label="Webhook" value={`POST /h/${data.slug}`} mono highlight />
                )}
                {data.hookType === 'rss' && (
                  <>
                    <Row label="Feed URL" value={data.feedUrl} mono />
                    <Row label="Poll interval" value={`${Math.round(data.feedRefresh / 60000)} min`} />
                    <Row label="Route slug" value={data.slug} mono />
                  </>
                )}
                <Row label="Use case" value={USE_CASES.find(u => u.id === data.useCase)?.label ?? data.useCase} />
                {data.mcp && <Row label="MCP Server" value={data.mcp.name} mono />}
                {data.tools.length > 0 && <Row label="Tools" value={data.tools.join(', ')} mono />}
                <Row label="Mode" value={data.mode} />
              </div>

              {data.instructions && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Agent instructions</p>
                  <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 whitespace-pre-wrap">{data.instructions}</pre>
                </div>
              )}

              {error && (
                <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-zinc-400 hover:text-zinc-200 text-sm transition-colors"
                >
                  ← Back
                </button>
                <button
                  data-testid="launch"
                  onClick={handleFinish}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Launch HookLaw'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-500">{label}</span>
      <span className={`${mono ? 'font-mono text-xs' : ''} ${highlight ? 'text-emerald-400' : 'text-zinc-200'}`}>{value}</span>
    </div>
  );
}
