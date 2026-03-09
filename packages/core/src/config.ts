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
