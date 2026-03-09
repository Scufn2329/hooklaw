import { useEffect, useState } from 'react';
import { api, type Recipe, type McpServer } from '../api/client.ts';

export function Webhooks() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [payload, setPayload] = useState('{\n  "event": "test",\n  "message": "Hello HookLaw!"\n}');
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState('');
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);

  useEffect(() => {
    api.getRecipes().then((r) => {
      setRecipes(r.recipes);
      const slugs = [...new Set(r.recipes.filter((r) => r.enabled).map((r) => r.slug))];
      if (slugs.length > 0 && !selectedSlug) setSelectedSlug(slugs[0]);
    });
    api.getMcpServers().then((r) => setMcpServers(r.servers)).catch(() => {});
  }, []);

  const slugs = [...new Set(recipes.filter((r) => r.enabled).map((r) => r.slug))];

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  async function sendTest() {
    if (!selectedSlug) return;
    setSending(true);
    setResponse(null);
    try {
      const parsed = JSON.parse(payload);
      const result = await api.sendWebhook(selectedSlug, parsed);
      setResponse(JSON.stringify(result, null, 2));
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  }

  // Get all tools referenced by recipes and map to their MCP server
  const allTools = [...new Set(recipes.flatMap((r) => r.tools))];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Webhooks</h2>
        <p className="text-sm text-zinc-500 mt-1">Endpoints, recipes, agents and tools</p>
      </div>

      {/* Webhook endpoints */}
      {slugs.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500 text-sm">No active webhook slugs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slugs.map((slug) => {
            const slugRecipes = recipes.filter((r) => r.slug === slug && r.enabled);
            const webhookUrl = `${window.location.origin}/h/${slug}`;
            const curlCmd = `curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;

            return (
              <div key={slug} className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                {/* Webhook header */}
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">POST</span>
                      <code className="text-sm text-zinc-200 font-mono truncate">/h/{slug}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyBtn
                        label={copied === `url-${slug}` ? 'Copied!' : 'Copy URL'}
                        onClick={() => copyToClipboard(webhookUrl, `url-${slug}`)}
                        active={copied === `url-${slug}`}
                      />
                      <CopyBtn
                        label={copied === `curl-${slug}` ? 'Copied!' : 'Copy curl'}
                        onClick={() => copyToClipboard(curlCmd, `curl-${slug}`)}
                        active={copied === `curl-${slug}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Recipes for this slug */}
                <div className="divide-y divide-zinc-800/30">
                  {slugRecipes.map((recipe) => {
                    const isExpanded = expandedRecipe === recipe.id;
                    return (
                      <div key={recipe.id}>
                        <button
                          onClick={() => setExpandedRecipe(isExpanded ? null : recipe.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-200">{recipe.id}</p>
                              <p className="text-xs text-zinc-500 truncate">{recipe.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{recipe.mode}</span>
                            <svg
                              className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded recipe details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-4">
                            {/* Agent */}
                            <Section title="Agent">
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Provider" value={recipe.provider ?? 'unknown'} />
                                <Field label="Model" value={recipe.model ?? 'default'} mono />
                              </div>
                              {recipe.instructions && (
                                <div className="mt-3">
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Instructions</p>
                                  <pre className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-lg p-3 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                    {recipe.instructions}
                                  </pre>
                                </div>
                              )}
                            </Section>

                            {/* Tools */}
                            <Section title="Tools">
                              {recipe.tools.length === 0 ? (
                                <p className="text-xs text-zinc-600">No tools configured</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {recipe.tools.map((tool) => {
                                    const server = mcpServers.find((s) => s.name === tool);
                                    return (
                                      <div
                                        key={tool}
                                        className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                        <span className="text-xs text-zinc-200 font-mono">{tool}</span>
                                        {server && (
                                          <span className="text-[10px] text-zinc-500">
                                            via {server.command} {server.args?.slice(0, 2).join(' ')}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </Section>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available MCP Tools */}
      {mcpServers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Available MCP Servers</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {mcpServers.map((server) => {
              const usedBy = recipes.filter((r) => r.tools.includes(server.name));
              return (
                <div
                  key={server.name}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="text-sm font-mono text-zinc-200">{server.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{server.transport}</span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono truncate">
                    {server.command} {server.args?.join(' ')}
                  </div>
                  {usedBy.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-600">Used by:</span>
                      {usedBy.map((r) => (
                        <span key={r.id} className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">{r.id}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-zinc-600">Not used by any recipe</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Test webhook */}
      {slugs.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Test Webhook</h3>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-zinc-500">POST /h/</span>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {slugs.map((slug) => (
                <option key={slug} value={slug}>{slug}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-1">Payload (JSON)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-300 font-mono text-sm rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />
          </div>

          <button
            onClick={sendTest}
            disabled={sending || !selectedSlug}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            {sending ? 'Sending...' : 'Send Webhook'}
          </button>

          {response && (
            <div>
              <p className="text-xs text-zinc-500 mb-1">Response</p>
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 overflow-auto max-h-48">
                {response}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/50 p-3">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-600">{label}</p>
      <p className={`text-sm text-zinc-200 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function CopyBtn({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
        active
          ? 'border-emerald-600 text-emerald-400 bg-emerald-600/10'
          : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
      }`}
    >
      {label}
    </button>
  );
}
