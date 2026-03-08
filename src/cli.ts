#!/usr/bin/env node
import { Command } from 'commander';
import { bootstrap } from './index.js';

const program = new Command();

program
  .name('hooklaw')
  .description('Webhook orchestrator with AI agents and MCP tools')
  .version('0.1.0');

program
  .command('start')
  .description('Start the HookLaw server')
  .option('-c, --config <path>', 'Path to config file', 'hooklaw.config.yaml')
  .action(async (opts) => {
    try {
      await bootstrap({ configPath: opts.config });
    } catch (err) {
      console.error('Failed to start HookLaw:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Generate a starter hooklaw.config.yaml')
  .action(async () => {
    const { existsSync, writeFileSync } = await import('node:fs');
    const path = 'hooklaw.config.yaml';

    if (existsSync(path)) {
      console.error(`${path} already exists. Aborting.`);
      process.exit(1);
    }

    const template = `# HookLaw Configuration
server:
  port: 3007
  host: 0.0.0.0

providers:
  anthropic:
    api_key: \${ANTHROPIC_API_KEY}

# Shared MCP servers (referenced by recipes via "tools")
mcp_servers: {}
  # stripe:
  #   transport: stdio
  #   command: npx
  #   args: ["-y", "@stripe/agent-toolkit"]
  # contaazul:
  #   transport: stdio
  #   command: npx
  #   args: ["-y", "contaazul-mcp"]

# Recipes connect webhooks to AI agents with MCP tools
recipes:
  my-recipe:
    description: "Process incoming webhooks"
    slug: my-webhook          # webhook URL: POST /h/my-webhook
    mode: async
    agent:
      provider: anthropic
      model: claude-sonnet-4-20250514
      temperature: 0.3
      instructions: |
        You process incoming webhook payloads.
        Analyze the data and take appropriate action.
    tools: []                 # reference mcp_servers by name

logs:
  retention_days: 30
`;

    writeFileSync(path, template, 'utf-8');
    console.log(`Created ${path} — edit it and run: hooklaw start`);
  });

program.parse();
