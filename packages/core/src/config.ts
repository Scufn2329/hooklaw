import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { AppConfigSchema, type AppConfig } from './types.js';

const ENV_VAR_PATTERN = /\$\{([^}]+)\}/g;

let cachedConfig: AppConfig | null = null;

function substituteEnvVars(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(ENV_VAR_PATTERN, (_, varName: string) => {
      const envValue = process.env[varName];
      if (envValue === undefined) {
        return '';
      }
      return envValue;
    });
  }
  if (Array.isArray(value)) {
    return value.map(substituteEnvVars);
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = substituteEnvVars(v);
    }
    return result;
  }
  return value;
}

function loadDotenv(dir: string, filename: string = '.env'): void {
  const envPath = resolve(dir, filename);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

export function loadConfig(configPath?: string): AppConfig {
  const filePath = configPath ?? resolve(process.cwd(), 'hooklaw.config.yaml');
  const dir = resolve(filePath, '..');

  // Load env files (.env.local takes priority over .env)
  loadDotenv(dir, '.env');
  loadDotenv(dir, '.env.local');

  if (!existsSync(filePath)) {
    // Return defaults if no config file
    return AppConfigSchema.parse({});
  }

  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw);
  const substituted = substituteEnvVars(parsed);
  const validated = AppConfigSchema.parse(substituted);

  return validated;
}

export function getConfig(configPath?: string): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig(configPath);
  }
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export interface RecipeUpdate {
  description?: string;
  slug?: string;
  mode?: 'async' | 'sync';
  instructions?: string;
  model?: string;
  provider?: string;
  tools?: string[];
}

export interface NewRecipe {
  id: string;
  description: string;
  slug: string;
  mode: 'async' | 'sync';
  provider: string;
  model: string;
  instructions: string;
  tools: string[];
  mcp?: { name: string; config: { command: string; args: string[] } };
  feed?: { url: string; refresh: number; skip_initial: boolean };
}

export function addRecipeToFile(configPath: string, recipe: NewRecipe): void {
  const filePath = resolve(configPath);
  let parsed: Record<string, unknown>;

  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    parsed = parseYaml(raw) as Record<string, unknown>;
  } else {
    parsed = {};
  }

  // Ensure recipes section
  if (!parsed.recipes || typeof parsed.recipes !== 'object') {
    parsed.recipes = {};
  }
  const recipes = parsed.recipes as Record<string, unknown>;

  if (recipes[recipe.id]) {
    throw new Error(`Recipe "${recipe.id}" already exists`);
  }

  recipes[recipe.id] = {
    description: recipe.description,
    enabled: true,
    slug: recipe.slug,
    mode: recipe.mode,
    agent: {
      provider: recipe.provider,
      model: recipe.model,
      instructions: recipe.instructions,
    },
    tools: recipe.tools,
  };

  // Add MCP server if provided
  if (recipe.mcp) {
    if (!parsed.mcp_servers || typeof parsed.mcp_servers !== 'object') {
      parsed.mcp_servers = {};
    }
    const mcpServers = parsed.mcp_servers as Record<string, unknown>;
    if (!mcpServers[recipe.mcp.name]) {
      mcpServers[recipe.mcp.name] = {
        transport: 'stdio',
        command: recipe.mcp.config.command,
        args: recipe.mcp.config.args,
      };
    }
  }

  // Add feed source if provided
  if (recipe.feed) {
    if (!parsed.feeds || typeof parsed.feeds !== 'object') {
      parsed.feeds = {};
    }
    const feeds = parsed.feeds as Record<string, unknown>;
    feeds[recipe.id] = {
      url: recipe.feed.url,
      slug: recipe.slug,
      refresh: recipe.feed.refresh,
      skip_initial: recipe.feed.skip_initial,
      enabled: true,
    };
  }

  const yaml = stringifyYaml(parsed, { lineWidth: 0 });
  writeFileSync(filePath, yaml, 'utf-8');

  cachedConfig = null;
}

export interface NewMcpServer {
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export function addMcpServerToFile(configPath: string, server: NewMcpServer): void {
  const filePath = resolve(configPath);
  let parsed: Record<string, unknown>;

  if (existsSync(filePath)) {
    const raw = readFileSync(filePath, 'utf-8');
    parsed = parseYaml(raw) as Record<string, unknown>;
  } else {
    parsed = {};
  }

  if (!parsed.mcp_servers || typeof parsed.mcp_servers !== 'object') {
    parsed.mcp_servers = {};
  }
  const mcpServers = parsed.mcp_servers as Record<string, unknown>;

  if (mcpServers[server.name]) {
    throw new Error(`MCP server "${server.name}" already exists`);
  }

  const entry: Record<string, unknown> = { transport: server.transport };
  if (server.command) entry.command = server.command;
  if (server.args?.length) entry.args = server.args;
  if (server.env && Object.keys(server.env).length > 0) entry.env = server.env;
  if (server.url) entry.url = server.url;

  mcpServers[server.name] = entry;

  const yaml = stringifyYaml(parsed, { lineWidth: 0 });
  writeFileSync(filePath, yaml, 'utf-8');

  cachedConfig = null;
}

export function updateRecipeInFile(configPath: string, recipeId: string, update: RecipeUpdate): void {
  const filePath = resolve(configPath);
  const raw = readFileSync(filePath, 'utf-8');
  const parsed = parseYaml(raw) as Record<string, unknown>;

  const recipes = parsed.recipes as Record<string, Record<string, unknown>> | undefined;
  if (!recipes || !recipes[recipeId]) {
    throw new Error(`Recipe "${recipeId}" not found`);
  }

  const recipe = recipes[recipeId];
  if (update.description !== undefined) recipe.description = update.description;
  if (update.slug !== undefined) recipe.slug = update.slug;
  if (update.mode !== undefined) recipe.mode = update.mode;
  if (update.tools !== undefined) recipe.tools = update.tools;

  // Agent-level fields
  const agent = (recipe.agent ?? {}) as Record<string, unknown>;
  if (update.instructions !== undefined) agent.instructions = update.instructions;
  if (update.model !== undefined) agent.model = update.model;
  if (update.provider !== undefined) agent.provider = update.provider;
  recipe.agent = agent;

  const yaml = stringifyYaml(parsed, { lineWidth: 0 });
  writeFileSync(filePath, yaml, 'utf-8');

  // Invalidate cache
  cachedConfig = null;
}
