import { useEffect, useState } from 'react';
import { api, type Execution } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { timeAgo, formatDuration, tryParseJson } from '../lib/utils.ts';

export function Executions() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('limit', '50');
    if (statusFilter) params.set('status', statusFilter);

    api.getExecutions(params.toString())
      .then((r) => setExecutions(r.executions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Executions</h2>
          <p className="text-sm text-zinc-500 mt-1">Webhook processing history</p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading...</div>
      ) : executions.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500 text-sm">No executions found.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-zinc-900">
              <tr className="text-zinc-500 text-xs">
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Webhook</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Recipe</th>
                <th className="text-left p-3 font-medium">Duration</th>
                <th className="text-right p-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {executions.map((exec) => (
                <>
                  <tr
                    key={exec.id}
                    className="hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    onClick={() => setExpandedId(expandedId === exec.id ? null : exec.id)}
                  >
                    <td className="p-3"><StatusBadge status={exec.status} /></td>
                    <td className="p-3 text-zinc-300 font-mono text-xs">/h/{exec.hook_id}</td>
                    <td className="p-3 text-zinc-400 hidden sm:table-cell">{exec.recipe_id ?? '-'}</td>
                    <td className="p-3 text-zinc-400">{formatDuration(exec.duration_ms)}</td>
                    <td className="p-3 text-zinc-500 text-right">{timeAgo(exec.created_at)}</td>
                  </tr>
                  {expandedId === exec.id && (
                    <tr key={`${exec.id}-detail`}>
                      <td colSpan={5} className="p-4 bg-zinc-900/80">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">Payload</p>
                            <pre className="bg-zinc-950 rounded p-3 text-xs text-zinc-300 overflow-auto max-h-48">
                              {JSON.stringify(tryParseJson(exec.payload), null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-1">
                              {exec.error ? 'Error' : 'Output'}
                            </p>
                            <pre className="bg-zinc-950 rounded p-3 text-xs overflow-auto max-h-48 text-zinc-300">
                              {exec.error
                                ? <span className="text-red-400">{exec.error}</span>
                                : exec.agent_output ?? 'No output'}
                            </pre>
                            {exec.tools_called && (
                              <div className="mt-2">
                                <p className="text-xs text-zinc-500 mb-1">Tools called</p>
                                <p className="text-xs text-zinc-400">{exec.tools_called}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
