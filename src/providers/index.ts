import type { LLMProvider } from './base.js';
import type { ProviderConfig } from '../types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

const cache = new Map<string, LLMProvider>();

export function createProvider(name: string, config: ProviderConfig): LLMProvider {
  const cached = cache.get(name);
  if (cached) return cached;

  let provider: LLMProvider;

  switch (name) {
    case 'anthropic':
      if (!config.api_key) throw new Error(`Provider 'anthropic' requires api_key`);
      provider = new AnthropicProvider(config.api_key);
      break;

    case 'openai':
      if (!config.api_key) throw new Error(`Provider 'openai' requires api_key`);
      provider = new OpenAIProvider(config.api_key, config.base_url);
      break;

    case 'openrouter':
      if (!config.api_key) throw new Error(`Provider 'openrouter' requires api_key`);
      provider = new OpenAIProvider(config.api_key, config.base_url ?? 'https://openrouter.ai/api/v1');
      break;

    case 'ollama':
      provider = new OpenAIProvider('ollama', config.base_url ?? 'http://localhost:11434/v1');
      break;

    default:
      throw new Error(`Unknown provider: '${name}'. Supported: anthropic, openai, openrouter, ollama`);
  }

  cache.set(name, provider);
  return provider;
}

export function clearProviderCache(): void {
  cache.clear();
}

export type { LLMProvider, Message, ChatOptions, ChatResult, ToolDefinition, ToolCall } from './base.js';
