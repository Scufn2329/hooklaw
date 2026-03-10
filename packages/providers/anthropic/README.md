# @lucianfialho/hooklaw-provider-anthropic

Anthropic LLM provider for [HookLaw](https://github.com/lucianfialho/hooklaw).

## Supported Models

All Claude models via the Anthropic API: Claude Opus, Sonnet, Haiku.

## Configuration

```yaml
providers:
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
```

## Install

```bash
npm install @lucianfialho/hooklaw-provider-anthropic
```

## Usage

```typescript
import { registerAnthropicProvider } from '@lucianfialho/hooklaw-provider-anthropic';

registerAnthropicProvider();
```

Auto-registered when using the main `hooklaw` package.

## License

MIT
