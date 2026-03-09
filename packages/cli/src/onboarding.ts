import * as p from '@clack/prompts';
import pc from 'picocolors';
import { existsSync, writeFileSync } from 'node:fs';

const LOGO = `
    ${pc.green('▄▄▄▄▄▄')}
   ${pc.green('██')}${pc.dim('╔══')}${pc.green('██')}    ${pc.bold(pc.green('H o o k L a w'))}
   ${pc.green('██')}${pc.dim('║  ')}${pc.green('██')}    ${pc.dim('Webhook orchestrator with')}
   ${pc.green('██')}${pc.dim('║  ')}${pc.green('██')}    ${pc.dim('AI agents & MCP tools')}
   ${pc.green('██')}${pc.dim('╚══')}${pc.green('██')}
    ${pc.green('▀▀▀▀▀▀')}  ${pc.dim('v1.0.0')}
`;

const PROVIDERS = [
  { value: 'anthropic', label: 'Anthropic', hint: 'Claude models' },
  { value: 'openai', label: 'OpenAI', hint: 'GPT models' },
  { value: 'openrouter', label: 'OpenRouter', hint: 'Multi-provider gateway' },
  { value: 'ollama', label: 'Ollama', hint: 'Local models, no API key needed' },
] as const;

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-5.4',
  openrouter: 'openai/gpt-5.4',
  ollama: 'llama4',
};

interface OnboardingResult {
  provider: string;
  apiKeyEnvVar: string;
  model: string;
  slug: string;
  description: string;
  mode: 'async' | 'sync';
  port: number;
}

export async function runOnboarding(): Promise<void> {
  console.clear();
  console.log(LOGO);

  p.intro(pc.bgGreen(pc.black(' Welcome to HookLaw ')));

  const configPath = 'hooklaw.config.yaml';
  if (existsSync(configPath)) {
    p.log.warn(`${pc.yellow(configPath)} already exists.`);
    const overwrite = await p.confirm({
      message: 'Overwrite existing config?',
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.outro(pc.dim('Setup cancelled. Your config is safe.'));
      return;
    }
  }

  // Step 1: Provider
  const provider = await p.select({
    message: 'Which AI provider do you want to use?',
    options: PROVIDERS.map((p) => ({ value: p.value, label: p.label, hint: p.hint })),
  });

  if (p.isCancel(provider)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 2: API Key
  let apiKeyEnvVar = '';
  const needsKey = provider !== 'ollama';

  if (needsKey) {
    const envVarDefaults: Record<string, string> = {
      anthropic: 'ANTHROPIC_API_KEY',
      openai: 'OPENAI_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
    };

    const defaultVar = envVarDefaults[provider as string] ?? 'API_KEY';

    p.log.info(pc.dim(`Your API key will be referenced as \${${defaultVar}} in the config.`));
    p.log.info(pc.dim('Set it in your .env file or environment variables.'));

    const hasKey = await p.confirm({
      message: `Do you want to create a .env file with your API key now?`,
      initialValue: true,
    });

    if (p.isCancel(hasKey)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    apiKeyEnvVar = defaultVar;

    if (hasKey) {
      const apiKey = await p.password({
        message: `Paste your ${PROVIDERS.find((p) => p.value === provider)?.label} API key:`,
        validate: (val) => {
          if (!val || val.trim().length < 5) return 'API key seems too short';
        },
      });

      if (p.isCancel(apiKey)) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }

      // Write .env file
      const envContent = `${defaultVar}=${apiKey}\n`;
      if (existsSync('.env')) {
        const { readFileSync } = await import('node:fs');
        const existing = readFileSync('.env', 'utf-8');
        if (!existing.includes(defaultVar)) {
          writeFileSync('.env', existing + envContent);
          p.log.success(`Added ${pc.green(defaultVar)} to existing .env`);
        } else {
          p.log.info(`${pc.dim(defaultVar)} already in .env, skipping`);
        }
      } else {
        writeFileSync('.env', envContent);
        p.log.success(`Created ${pc.green('.env')} with your API key`);
      }
    }
  } else {
    p.log.info(pc.dim('Ollama runs locally — no API key needed.'));
    p.log.info(pc.dim('Make sure Ollama is running: ollama serve'));
  }

  // Step 3: First recipe
  p.log.step(pc.bold('Let\'s create your first recipe'));

  const slug = await p.text({
    message: 'Webhook slug (URL will be POST /h/<slug>)',
    placeholder: 'my-webhook',
    defaultValue: 'my-webhook',
    validate: (val) => {
      if (!val) return 'Slug is required';
      if (!/^[a-z0-9-]+$/.test(val)) return 'Use only lowercase letters, numbers, and hyphens';
    },
  });

  if (p.isCancel(slug)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const description = await p.text({
    message: 'Recipe description',
    placeholder: 'Process incoming webhooks',
    defaultValue: 'Process incoming webhooks',
  });

  if (p.isCancel(description)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const model = await p.text({
    message: 'Model to use',
    placeholder: DEFAULT_MODELS[provider as string],
    defaultValue: DEFAULT_MODELS[provider as string],
  });

  if (p.isCancel(model)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  const mode = await p.select({
    message: 'Processing mode',
    options: [
      { value: 'async', label: 'Async', hint: 'respond immediately, process in background' },
      { value: 'sync', label: 'Sync', hint: 'wait for AI response, return in HTTP response' },
    ],
  });

  if (p.isCancel(mode)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 4: Server config
  const port = await p.text({
    message: 'Server port',
    placeholder: '3007',
    defaultValue: '3007',
    validate: (val) => {
      const n = parseInt(val ?? '', 10);
      if (isNaN(n) || n < 1 || n > 65535) return 'Enter a valid port number';
    },
  });

  if (p.isCancel(port)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Generate config
  const result: OnboardingResult = {
    provider: provider as string,
    apiKeyEnvVar,
    model: model as string,
    slug: slug as string,
    description: description as string,
    mode: mode as 'async' | 'sync',
    port: parseInt(port as string, 10),
  };

  const config = generateConfig(result);

  const s = p.spinner();
  s.start('Writing hooklaw.config.yaml');
  writeFileSync(configPath, config, 'utf-8');
  await sleep(400);
  s.stop('Config created');

  // Summary
  console.log('');
  p.log.success(pc.bold('HookLaw is ready!'));
  console.log('');
  console.log(`  ${pc.dim('Config:')}    ${pc.green(configPath)}`);
  console.log(`  ${pc.dim('Provider:')}  ${pc.green(result.provider)}`);
  console.log(`  ${pc.dim('Model:')}    ${pc.green(result.model)}`);
  console.log(`  ${pc.dim('Webhook:')}   ${pc.cyan(`POST http://localhost:${result.port}/h/${result.slug}`)}`);
  console.log(`  ${pc.dim('Mode:')}     ${pc.green(result.mode)}`);
  console.log('');

  p.note(
    [
      `${pc.bold('Start the server:')}`,
      `  ${pc.green('hooklaw start')}`,
      '',
      `${pc.bold('Send a test webhook:')}`,
      `  ${pc.cyan(`curl -X POST http://localhost:${result.port}/h/${result.slug} \\`)}`,
      `  ${pc.cyan(`  -H "Content-Type: application/json" \\`)}`,
      `  ${pc.cyan(`  -d '{"event": "test", "message": "Hello HookLaw!"}'`)}`,
    ].join('\n'),
    'Next steps'
  );

  p.outro(pc.dim('Happy hooking! 🎣'));
}

function generateConfig(result: OnboardingResult): string {
  const providerBlock = result.provider === 'ollama'
    ? `  ollama:\n    base_url: http://localhost:11434/v1`
    : `  ${result.provider}:\n    api_key: \${${result.apiKeyEnvVar}}`;

  return `# HookLaw Configuration
# Docs: https://github.com/lucianfialho/hooklaw

server:
  port: ${result.port}
  host: 0.0.0.0

providers:
${providerBlock}

# Shared MCP servers (referenced by recipes via "tools")
mcp_servers: {}
  # stripe:
  #   transport: stdio
  #   command: npx
  #   args: ["-y", "@stripe/agent-toolkit"]

# Recipes connect webhooks to AI agents with MCP tools
recipes:
  ${result.slug}:
    description: "${result.description}"
    slug: ${result.slug}
    mode: ${result.mode}
    agent:
      provider: ${result.provider}
      model: ${result.model}
      instructions: |
        You process incoming webhook payloads.
        Analyze the data and take appropriate action.
        Be concise and actionable in your responses.
    tools: []

logs:
  retention_days: 30
`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
