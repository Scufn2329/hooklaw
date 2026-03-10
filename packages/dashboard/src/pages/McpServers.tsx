import { useEffect, useState } from 'react';
import { api, type McpServer, type McpHealthResult } from '../api/client.ts';
import { PageHeader, Badge } from '../components/DataTable.tsx';

type ServerWithHealth = McpServer & {
  health?: McpHealthResult;
};

export function McpServers() {
  const [servers, setServers] = useState<ServerWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', transport: 'stdio' as 'stdio' | 'sse', command: '', args: '', url: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    api.getMcpServers()
      .then((r) => setServers(r.servers.map((s) => ({ ...s }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-check health on load
  useEffect(() => {
    if (servers.length > 0 && !servers.some((s) => s.health)) {
      checkAll();
    }
  }, [servers.length]);

  async function checkAll() {
    try {
      const results = await api.checkAllMcpHealth();
      setServers((prev) =>
        prev.map((s) => {
          const health = results.servers.find((h) => h.name === s.name);
          return health ? { ...s, health } : s;
        }),
      );
    } catch {}
  }

  async function checkOne(name: string) {
    setChecking((prev) => new Set(prev).add(name));
    try {
      const health = await api.checkMcpHealth(name);
      setServers((prev) =>
        prev.map((s) => (s.name === name ? { ...s, health } : s)),
      );
    } catch {}
    setChecking((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  async function handleAddServer() {
    if (!addForm.name.trim()) {
      setAddError('Name is required');
      return;
    }
    if (addForm.transport === 'stdio' && !addForm.command.trim()) {
      setAddError('Command is required for stdio transport');
      return;
    }
    if (addForm.transport === 'sse' && !addForm.url.trim()) {
      setAddError('URL is required for SSE transport');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const data: Record<string, unknown> = {
        name: addForm.name.trim(),
        transport: addForm.transport,
      };
      if (addForm.transport === 'stdio') {
        data.command = addForm.command.trim();
        if (addForm.args.trim()) {
          data.args = addForm.args.trim().split(/\s+/);
        }
      } else {
        data.url = addForm.url.trim();
      }
      await api.addMcpServer(data as Parameters<typeof api.addMcpServer>[0]);
      // Reload servers
      const r = await api.getMcpServers();
      setServers(r.servers.map((s) => ({ ...s })));
      setShowAdd(false);
      setAddForm({ name: '', transport: 'stdio', command: '', args: '', url: '' });
      // Check health of the new server
      checkAll();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add server');
    }
    setAddSaving(false);
  }

  async function installPkg(name: string) {
    setInstalling((prev) => new Set(prev).add(name));
    try {
      await api.installMcpPackage(name);
      // Re-check after install
      await checkOne(name);
    } catch {}
    setInstalling((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="MCP Servers" description="Model Context Protocol servers connected to HookLaw" />
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-12 text-center">
          <div className="inline-flex items-center gap-2 text-zinc-500 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="MCP Servers" description="Model Context Protocol servers connected to HookLaw">
        <button
          onClick={checkAll}
          className="text-zinc-400 hover:text-zinc-200 text-sm border border-zinc-700 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          Check All
        </button>
        <button
          onClick={() => { setShowAdd(!showAdd); setAddError(''); }}
          className="text-sm bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {showAdd ? 'Cancel' : 'Add Server'}
        </button>
      </PageHeader>

      {/* Add MCP Server form */}
      {showAdd && (
        <div className="rounded-xl border border-purple-800/40 bg-purple-950/20 p-5 mb-4 space-y-4">
          <p className="text-sm font-medium text-zinc-100">New MCP Server</p>

          {addError && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg px-3 py-2 text-xs text-red-400">
              {addError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g. my-mcp-server"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Transport */}
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Transport</label>
              <div className="flex gap-2">
                {(['stdio', 'sse'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddForm({ ...addForm, transport: t })}
                    className={`flex-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
                      addForm.transport === t
                        ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* stdio fields */}
          {addForm.transport === 'stdio' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Command</label>
                <input
                  type="text"
                  placeholder="e.g. npx or node"
                  value={addForm.command}
                  onChange={(e) => setAddForm({ ...addForm, command: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1">Arguments</label>
                <input
                  type="text"
                  placeholder="e.g. -y @modelcontextprotocol/server-github"
                  value={addForm.args}
                  onChange={(e) => setAddForm({ ...addForm, args: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* SSE field */}
          {addForm.transport === 'sse' && (
            <div>
              <label className="block text-[11px] text-zinc-500 uppercase tracking-wider mb-1">URL</label>
              <input
                type="text"
                placeholder="e.g. http://localhost:3001/sse"
                value={addForm.url}
                onChange={(e) => setAddForm({ ...addForm, url: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleAddServer}
              disabled={addSaving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              {addSaving ? (
                <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg> Saving...</>
              ) : (
                'Add Server'
              )}
            </button>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-12 text-center">
          <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
            <McpIcon size={20} className="text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400">No MCP servers configured</p>
          <p className="text-xs text-zinc-600 mt-1">Add servers in hooklaw.config.yaml under mcp_servers</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server) => {
            const isExpanded = expanded === server.name;
            const status = server.health?.status;
            const tools = server.health?.tools ?? [];
            const isChecking = checking.has(server.name);
            const isInstalling = installing.has(server.name);

            return (
              <div
                key={server.name}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : server.name)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-zinc-800/20 transition-colors"
                >
                  {/* Status dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    status === 'connected' ? 'bg-emerald-400' :
                    status === 'error' ? 'bg-red-400' :
                    status === 'not_installed' ? 'bg-amber-400' :
                    'bg-zinc-600'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{server.name}</span>
                      <Badge color={server.transport === 'stdio' ? 'zinc' : 'blue'}>{server.transport}</Badge>
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                      {server.command ? `${server.command} ${(server.args ?? []).join(' ')}` : '—'}
                    </div>
                  </div>

                  {/* Tools count */}
                  {tools.length > 0 && (
                    <span className="text-xs text-zinc-500">{tools.length} tool{tools.length !== 1 ? 's' : ''}</span>
                  )}

                  {/* Status badge */}
                  {status && (
                    <Badge color={
                      status === 'connected' ? 'emerald' :
                      status === 'error' ? 'red' :
                      status === 'not_installed' ? 'amber' : 'zinc'
                    }>
                      {status === 'not_installed' ? 'not installed' : status}
                    </Badge>
                  )}

                  {/* Chevron */}
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                    className={`text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/60 p-4 space-y-4">
                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => checkOne(server.name)}
                        disabled={isChecking}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {isChecking ? (
                          <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg> Checking...</>
                        ) : (
                          'Check Health'
                        )}
                      </button>

                      {status === 'not_installed' && server.packageName && (
                        <button
                          onClick={() => installPkg(server.name)}
                          disabled={isInstalling}
                          className="text-xs bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          {isInstalling ? (
                            <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg> Installing...</>
                          ) : (
                            <>Install {server.packageName}</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Error */}
                    {server.health?.error && (
                      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-3 text-xs text-red-400 font-mono">
                        {server.health.error}
                      </div>
                    )}

                    {/* Tools list */}
                    {tools.length > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Available Tools</p>
                        <div className="grid gap-1.5">
                          {tools.map((tool) => (
                            <div
                              key={tool.name}
                              className="flex items-start gap-3 bg-zinc-800/30 border border-zinc-800/50 rounded-lg px-3 py-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-zinc-200 font-mono">{tool.name}</p>
                                {tool.description && (
                                  <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{tool.description}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Server details */}
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Configuration</p>
                      <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-3 text-xs font-mono text-zinc-400 space-y-1">
                        <p><span className="text-zinc-600">transport:</span> {server.transport}</p>
                        {server.command && <p><span className="text-zinc-600">command:</span> {server.command}</p>}
                        {server.args && <p><span className="text-zinc-600">args:</span> {server.args.join(' ')}</p>}
                        {server.packageName && <p><span className="text-zinc-600">package:</span> {server.packageName}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function McpIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01" />
      <path d="M6 14h12" />
    </svg>
  );
}
