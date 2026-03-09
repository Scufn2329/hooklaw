#!/usr/bin/env node

// Side-effect imports: register all built-in providers
import '@lucianfialho/hooklaw-provider-openai';
import '@lucianfialho/hooklaw-provider-anthropic';

import { Command } from 'commander';

const program = new Command();

program
  .name('hooklaw')
  .description('Webhook orchestrator with AI agents and MCP tools')
  .version('1.0.0');

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
      const { bootstrap } = await import('@lucianfialho/hooklaw-core');
      await bootstrap({ configPath: opts.config });
    } catch (err) {
      console.error('Failed to start HookLaw:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Interactive setup — create hooklaw.config.yaml')
  .action(async () => {
    const { runOnboarding } = await import('./onboarding.js');
    await runOnboarding();
  });

program.parse();
