# @lucianfialho/hooklaw-provider-openai

OpenAI-compatible LLM provider for [HookLaw](https://github.com/lucianfialho/hooklaw).

Supports OpenAI, OpenRouter, Ollama, and any OpenAI-compatible API.

## Supported Services

| Service | Config key | Notes |
|---------|-----------|-------|
| **OpenAI** | `openai` | GPT models, set `api_key` |
| **OpenRouter** | `openrouter` | Multi-model gateway, set `api_key` and `base_url` |
| **Ollama** | `ollama` | Local models, set `base_url: http://localhost:11434/v1` |

## Configuration

```yaml
providers:
  openai:
    api_key: ${OPENAI_API_KEY}

  ollama:
    base_url: http://localhost:11434/v1
```

## Install

```bash
npm install @lucianfialho/hooklaw-provider-openai
```

## Usage

```typescript
import { registerOpenAIProvider } from '@lucianfialho/hooklaw-provider-openai';

registerOpenAIProvider();
```

Auto-registered when using the main `hooklaw` package.

## License

MIT
