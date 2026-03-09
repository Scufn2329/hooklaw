import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Recipe } from '../api/client.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';

export function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRecipes()
      .then((r) => setRecipes(r.recipes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Recipes</h2>
        <p className="text-sm text-zinc-500 mt-1">Webhook → AI agent → MCP tool pipelines</p>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading...</div>
      ) : recipes.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500 text-sm">No recipes configured yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Add recipes in hooklaw.config.yaml</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              to={recipe.id}
              className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-100">{recipe.id}</h3>
                    <StatusBadge status={recipe.enabled ? 'enabled' : 'disabled'} />
                    <StatusBadge status={recipe.mode} />
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">{recipe.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
                <span>Slug: <span className="font-mono text-zinc-400">/h/{recipe.slug}</span></span>
                {recipe.tools.length > 0 && (
                  <span>Tools: {recipe.tools.join(', ')}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
