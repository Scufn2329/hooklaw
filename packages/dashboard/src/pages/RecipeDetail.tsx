import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type Recipe, type Execution } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { timeAgo, formatDuration } from '../lib/utils.ts';

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getRecipes().then((r) => {
      setRecipe(r.recipes.find((rec) => rec.id === id) ?? null);
    });
    api.getRecipeExecutions(id).then((r) => setExecutions(r.executions));
  }, [id]);

  if (!recipe) {
    return <div className="text-zinc-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/dashboard/recipes" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Recipes
        </Link>
        <h2 className="text-2xl font-bold mt-2">{recipe.id}</h2>
        <p className="text-sm text-zinc-500 mt-1">{recipe.description}</p>
      </div>

      {/* Recipe info */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
          <div>
            <span className="text-zinc-500 text-xs">Slug</span>
            <p className="font-mono text-zinc-300">/h/{recipe.slug}</p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Mode</span>
            <p><StatusBadge status={recipe.mode} /></p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Status</span>
            <p><StatusBadge status={recipe.enabled ? 'enabled' : 'disabled'} /></p>
          </div>
          <div>
            <span className="text-zinc-500 text-xs">Tools</span>
            <p className="text-zinc-300">{recipe.tools.length > 0 ? recipe.tools.join(', ') : 'None'}</p>
          </div>
        </div>
      </div>

      {/* Executions */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Executions</h3>
        {executions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No executions yet.</p>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="bg-zinc-900">
                <tr className="text-zinc-500 text-xs">
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium hidden sm:table-cell">Output</th>
                  <th className="text-right p-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {executions.map((exec) => (
                  <tr key={exec.id} className="hover:bg-zinc-800/50">
                    <td className="p-3"><StatusBadge status={exec.status} /></td>
                    <td className="p-3 text-zinc-400">{formatDuration(exec.duration_ms)}</td>
                    <td className="p-3 text-zinc-400 max-w-md truncate hidden sm:table-cell">
                      {exec.error ?? exec.agent_output ?? '-'}
                    </td>
                    <td className="p-3 text-zinc-500 text-right">{timeAgo(exec.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
