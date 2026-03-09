import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Recipes } from './pages/Recipes.tsx';
import { RecipeDetail } from './pages/RecipeDetail.tsx';
import { Executions } from './pages/Executions.tsx';
import { Webhooks } from './pages/Webhooks.tsx';
import { ConfigViewer } from './pages/ConfigViewer.tsx';
import { Setup } from './pages/Setup.tsx';

export function App() {
  const [mode, setMode] = useState<'loading' | 'setup' | 'ready'>('loading');

  useEffect(() => {
    fetch('/api/mode')
      .then((r) => r.json())
      .then((data) => setMode(data.mode === 'setup' ? 'setup' : 'ready'))
      .catch(() => setMode('ready'));
  }, []);

  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <Routes>
        <Route path="*" element={<Setup />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="recipes" element={<Recipes />} />
        <Route path="recipes/:id" element={<RecipeDetail />} />
        <Route path="executions" element={<Executions />} />
        <Route path="webhooks" element={<Webhooks />} />
        <Route path="config" element={<ConfigViewer />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Route>
    </Routes>
  );
}
