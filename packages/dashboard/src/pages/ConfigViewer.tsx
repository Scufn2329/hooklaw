import { useEffect, useState } from 'react';
import { api } from '../api/client.ts';

export function ConfigViewer() {
  const [config, setConfig] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Config</h2>
        <p className="text-sm text-zinc-500 mt-1">Current server configuration (API keys redacted)</p>
      </div>

      {loading ? (
        <div className="text-zinc-500 text-sm">Loading...</div>
      ) : config ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <pre className="p-4 text-sm text-zinc-300 font-mono overflow-auto max-h-[70vh]">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-500 text-sm">Could not load config.</p>
        </div>
      )}
    </div>
  );
}
