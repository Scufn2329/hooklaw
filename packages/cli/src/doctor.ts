import pc from 'picocolors';
import { existsSync, readFileSync } from 'node:fs';
import { getRegisteredProviders } from '@lucianfialho/hooklaw-core';

interface Check {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

export async function runDoctor(configPath: string): Promise<void> {
  console.log(`\n  ${pc.bold('hooklaw doctor')}\n`);

  const checks: Check[] = [];

  // 1. Config file
  if (existsSync(configPath)) {
    checks.push({ name: 'Config file', status: 'pass', message: `Found ${configPath}` });

    // Parse config to inspect
    try {
      const { loadConfig } = await import('@lucianfialho/hooklaw-core');
      const config = loadConfig(configPath);

      // 2. Providers
      const providerNames = Object.keys(config.providers);
      if (providerNames.length > 0) {
        for (const name of providerNames) {
          const prov = config.providers[name];
          if (prov.api_key && prov.api_key.startsWith('${')) {
            const envVar = prov.api_key.slice(2, -1);
            if (process.env[envVar]) {
              checks.push({ name: `Provider: ${name}`, status: 'pass', message: `API key set via $${envVar}` });
            } else {
              checks.push({ name: `Provider: ${name}`, status: 'fail', message: `Missing env var $${envVar}` });
            }
          } else if (name === 'ollama') {
            // Check if Ollama is reachable
            const baseUrl = prov.base_url ?? 'http://localhost:11434';
            try {
              const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
              if (res.ok) {
                checks.push({ name: `Provider: ${name}`, status: 'pass', message: `Ollama running at ${baseUrl}` });
              } else {
                checks.push({ name: `Provider: ${name}`, status: 'fail', message: `Ollama returned ${res.status}` });
              }
            } catch {
              checks.push({ name: `Provider: ${name}`, status: 'fail', message: `Cannot reach Ollama at ${baseUrl}` });
            }
          } else {
            checks.push({ name: `Provider: ${name}`, status: 'pass', message: 'Configured' });
          }
        }
      } else {
        checks.push({ name: 'Providers', status: 'fail', message: 'No providers configured' });
      }

      // 3. Recipes
      const recipeCount = Object.keys(config.recipes).length;
      const enabledCount = Object.values(config.recipes).filter(r => r.enabled).length;
      if (recipeCount > 0) {
        checks.push({ name: 'Recipes', status: 'pass', message: `${enabledCount}/${recipeCount} enabled` });
      } else {
        checks.push({ name: 'Recipes', status: 'warn', message: 'No recipes configured' });
      }

      // 4. Port availability
      const port = config.server.port;
      try {
        const net = await import('node:net');
        const available = await new Promise<boolean>((resolve) => {
          const srv = net.createServer();
          srv.once('error', () => resolve(false));
          srv.once('listening', () => { srv.close(); resolve(true); });
          srv.listen(port, config.server.host);
        });
        if (available) {
          checks.push({ name: `Port ${port}`, status: 'pass', message: 'Available' });
        } else {
          checks.push({ name: `Port ${port}`, status: 'warn', message: 'Already in use (server may be running)' });
        }
      } catch {
        checks.push({ name: `Port ${port}`, status: 'warn', message: 'Could not check' });
      }

      // 5. MCP servers
      const mcpCount = Object.keys(config.mcp_servers).length;
      if (mcpCount > 0) {
        checks.push({ name: 'MCP servers', status: 'pass', message: `${mcpCount} configured` });
      } else {
        checks.push({ name: 'MCP servers', status: 'warn', message: 'None configured (optional)' });
      }

    } catch (err) {
      checks.push({ name: 'Config parse', status: 'fail', message: err instanceof Error ? err.message : String(err) });
    }
  } else {
    checks.push({ name: 'Config file', status: 'fail', message: `Not found: ${configPath}. Run ${pc.green('hooklaw init')}` });
  }

  // 6. Registered providers (from side-effect imports)
  const registered = getRegisteredProviders();
  checks.push({ name: 'Provider plugins', status: 'pass', message: `${registered.length} loaded: ${registered.join(', ')}` });

  // 7. Node version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1), 10);
  if (major >= 20) {
    checks.push({ name: 'Node.js', status: 'pass', message: nodeVersion });
  } else {
    checks.push({ name: 'Node.js', status: 'fail', message: `${nodeVersion} (requires >=20)` });
  }

  // 8. .env file
  if (existsSync('.env')) {
    checks.push({ name: '.env file', status: 'pass', message: 'Found' });
  } else {
    checks.push({ name: '.env file', status: 'warn', message: 'Not found (API keys must be set in environment)' });
  }

  // 9. Database
  if (existsSync('hooklaw.db')) {
    const stats = (await import('node:fs')).statSync('hooklaw.db');
    const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
    checks.push({ name: 'Database', status: 'pass', message: `hooklaw.db (${sizeMB} MB)` });
  } else {
    checks.push({ name: 'Database', status: 'warn', message: 'Not created yet (will be created on first start)' });
  }

  // Print results
  const icons = { pass: pc.green('✓'), fail: pc.red('✗'), warn: pc.yellow('!') };
  let hasFailure = false;

  for (const check of checks) {
    const icon = icons[check.status];
    const name = check.status === 'fail' ? pc.red(check.name) : check.status === 'warn' ? pc.yellow(check.name) : check.name;
    console.log(`  ${icon} ${name}  ${pc.dim(check.message)}`);
    if (check.status === 'fail') hasFailure = true;
  }

  console.log('');
  if (hasFailure) {
    console.log(`  ${pc.red('Some checks failed.')} Fix the issues above and run ${pc.green('hooklaw doctor')} again.\n`);
    process.exit(1);
  } else {
    console.log(`  ${pc.green('All checks passed!')} Run ${pc.green('hooklaw start')} to launch.\n`);
  }
}
