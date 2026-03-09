import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Stats, type Execution, type Recipe, type McpServer } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { RecipeFlow } from '../components/RecipeFlow.tsx';
import { timeAgo, formatDuration } from '../lib/utils.ts';

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastExec, setLastExec] = useState<Execution | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [health, setHealth] = useState<'ok' | 'error' | 'loading'>('loading');
  const [execOpen, setExecOpen] = useState(false);

  useEffect(() => {
    api.getHealth().then(() => setHealth('ok')).catch(() => setHealth('error'));
    api.getStats().then(setStats).catch(() => {});
    api.getExecutions('limit=1').then((r) => setLastExec(r.executions[0] ?? null)).catch(() => {});
    api.getRecipes().then((r) => setRecipes(r.recipes)).catch(() => {});
    api.getMcpServers().then((r) => setMcpServers(r.servers)).catch(() => {});
  }, []);

  return (
    <div className="relative w-full h-full -m-4 md:-m-6" style={{ height: 'calc(100vh - 3.5rem)', minHeight: 500 }}>
      {/* Full-screen React Flow canvas */}
      <div className="absolute inset-0">
        <RecipeFlow
          recipes={recipes}
          mcpServers={mcpServers}
          onRecipesChange={() => {
            api.getRecipes().then((r) => setRecipes(r.recipes)).catch(() => {});
          }}
        />
      </div>

      {/* Floating dashboard overlay */}
      <div className="relative z-10 pointer-events-none h-full flex flex-col justify-between p-4 md:p-6">
        {/* Top: stats row */}
        <div className="space-y-3 pointer-events-auto">
          <div className="flex items-center gap-3 flex-wrap">
            <Pill
              label="Server"
              value={health === 'loading' ? '...' : health === 'ok' ? 'Online' : 'Offline'}
              color={health === 'ok' ? 'text-emerald-400' : health === 'error' ? 'text-red-400' : 'text-zinc-400'}
              dot={health === 'ok' ? 'bg-emerald-400' : health === 'error' ? 'bg-red-400' : 'bg-zinc-600'}
            />
            <Pill label="Recipes" value={stats?.activeRecipes ?? '...'} />
            <Pill label="Executions" value={stats?.totalExecutions ?? '...'} />
            <Pill
              label="Success"
              value={stats ? (stats.totalExecutions > 0 ? `${Math.round((stats.successCount / stats.totalExecutions) * 100)}%` : '-') : '...'}
              color={stats && stats.totalExecutions > 0 ? (stats.errorCount === 0 ? 'text-emerald-400' : 'text-amber-400') : undefined}
            />
            <Pill label="Errors" value={stats?.errorCount ?? 0} color={stats && stats.errorCount > 0 ? 'text-red-400' : undefined} />
          </div>
        </div>

        {/* Bottom: last execution pill */}
        {lastExec && (
          <div className="pointer-events-auto">
            <button
              onClick={() => setExecOpen(!execOpen)}
              className="backdrop-blur-xl bg-zinc-950/70 border border-zinc-800/80 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl hover:border-zinc-700 transition-colors"
            >
              <StatusBadge status={lastExec.status} />
              <span className="text-zinc-300 font-mono text-xs">/h/{lastExec.hook_id}</span>
              <span className="text-zinc-600 text-xs">{formatDuration(lastExec.duration_ms)}</span>
              <span className="text-zinc-600 text-xs">{timeAgo(lastExec.created_at)}</span>
              <svg className={`w-3 h-3 text-zinc-500 transition-transform ${execOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              <Link
                to="executions"
                onClick={(e) => e.stopPropagation()}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 ml-1"
              >
                View all →
              </Link>
            </button>

            {execOpen && lastExec.agent_output && (
              <div className="mt-2 backdrop-blur-xl bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 max-w-lg shadow-2xl">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap max-h-40 overflow-y-auto">{lastExec.agent_output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, color, dot }: { label: string; value: string | number; color?: string; dot?: string }) {
  return (
    <div className="backdrop-blur-xl bg-zinc-950/70 border border-zinc-800/80 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg">
      {dot && <div className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />}
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold ${color ?? 'text-zinc-100'}`}>{value}</span>
    </div>
  );
}
