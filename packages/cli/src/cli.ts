#!/usr/bin/env node

// Side-effect imports: register all built-in providers
import '@lucianfialho/hooklaw-provider-openai';
import '@lucianfialho/hooklaw-provider-anthropic';

import { Command } from 'commander';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDashboardDir(): string | undefined {
  const dir = resolve(__dirname, '../../dashboard/dist');
  return existsSync(dir) ? dir : undefined;
}

const program = new Command();

program
  .name('hooklaw')
  .description('Webhook orchestrator with AI agents and MCP tools')
  .version('1.0.0');

// ── start ────────────────────────────────────────────────
program
  .command('start')
  .description('Start the HookLaw server')
  .option('-c, --config <path>', 'Path to config file', 'hooklaw.config.yaml')
  .option('-v, --verbose', 'Enable verbose/debug logging')
  .action(async (opts) => {
    try {
      if (opts.verbose) {
        process.env.LOG_LEVEL = 'debug';
      }

      // No config → launch web setup wizard
      if (!existsSync(opts.config)) {
        const pc = (await import('picocolors')).default;
        const dashboardDir = resolveDashboardDir();

        if (dashboardDir) {
          console.log('');
          console.log(`  ${pc.yellow('No config found.')} ${pc.dim(`Looking for ${opts.config}`)}`);
          console.log(`  ${pc.dim('Starting setup wizard in browser...')}`);
          console.log('');

          const { startSetupServer } = await import('@lucianfialho/hooklaw-core');
          await new Promise<void>((resolvePromise) => {
            startSetupServer({
              dashboardDir,
              configPath: opts.config,
              port: 3007,
              host: '0.0.0.0',
              onConfigCreated: () => resolvePromise(),
            });
          });

          // Config was created — continue to normal boot
          console.log('');
          console.log(`  ${pc.green('Config created!')} Starting HookLaw...`);
          console.log('');
        } else {
          // No dashboard available — fall back to CLI wizard
          console.log(pc.yellow('\n  No config found.') + pc.dim(` Looking for ${opts.config}`));
          console.log(pc.dim('  Running setup wizard...\n'));
          const { runOnboarding } = await import('./onboarding.js');
          await runOnboarding();

          if (!existsSync(opts.config)) {
            console.log(pc.dim('\n  No config created. Exiting.'));
            process.exit(0);
          }
          console.log('');
        }
      }

      const { bootstrap } = await import('@lucianfialho/hooklaw-core');
      const dashboardDir = resolveDashboardDir();

      await bootstrap({
        configPath: opts.config,
        dashboardDir,
      });
    } catch (err) {
      console.error('Failed to start HookLaw:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

// ── init ─────────────────────────────────────────────────
program
  .command('init')
  .description('Interactive setup — create hooklaw.config.yaml')
  .action(async () => {
    const { runOnboarding } = await import('./onboarding.js');
    await runOnboarding();
  });

// ── doctor ───────────────────────────────────────────────
program
  .command('doctor')
  .description('Check your HookLaw setup for issues')
  .option('-c, --config <path>', 'Path to config file', 'hooklaw.config.yaml')
  .action(async (opts) => {
    const { runDoctor } = await import('./doctor.js');
    await runDoctor(opts.config);
  });

// ── default behavior (no command) ────────────────────────
if (!process.argv.slice(2).length) {
  if (!existsSync('hooklaw.config.yaml')) {
    // No config, no command → same as `hooklaw start` (triggers setup)
    program.parse(['node', 'hooklaw', 'start']);
  } else {
    program.outputHelp();
  }
} else {
  program.parse();
}
