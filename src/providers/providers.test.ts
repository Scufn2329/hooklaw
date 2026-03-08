import { describe, it, expect, beforeEach } from 'vitest';
import { createProvider, clearProviderCache } from './index.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';

beforeEach(() => {
  clearProviderCache();
});

describe('createProvider', () => {
  it('creates AnthropicProvider for anthropic', () => {
    const p = createProvider('anthropic', { api_key: 'sk-ant-test' });
    expect(p).toBeInstanceOf(AnthropicProvider);
  });

  it('creates OpenAIProvider for openai', () => {
    const p = createProvider('openai', { api_key: 'sk-test' });
    expect(p).toBeInstanceOf(OpenAIProvider);
  });

  it('creates OpenAIProvider for openrouter', () => {
    const p = createProvider('openrouter', { api_key: 'sk-or-test' });
    expect(p).toBeInstanceOf(OpenAIProvider);
  });

  it('creates OpenAIProvider for ollama without api_key', () => {
    const p = createProvider('ollama', {});
    expect(p).toBeInstanceOf(OpenAIProvider);
  });

  it('throws for unknown provider', () => {
    expect(() => createProvider('unknown', {})).toThrow('Unknown provider');
  });

  it('throws for anthropic without api_key', () => {
    expect(() => createProvider('anthropic', {})).toThrow('requires api_key');
  });

  it('throws for openai without api_key', () => {
    expect(() => createProvider('openai', {})).toThrow('requires api_key');
  });

  it('caches provider instances', () => {
    const p1 = createProvider('ollama', {});
    const p2 = createProvider('ollama', {});
    expect(p1).toBe(p2);
  });
});
