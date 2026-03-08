# HookLaw

Self-hosted webhook orchestrator with AI agents and MCP tools. BYOK.

**Webhooks in, MCP tools out, AI agent in the middle.**

```
Stripe webhook  ──→  HookLaw Recipe  ──→  Conta Azul MCP (create invoice)
GitHub webhook  ──→  HookLaw Recipe  ──→  Slack MCP (send notification)
Any webhook     ──→  HookLaw Recipe  ──→  Any MCP server
```

## Why HookLaw

- **Native MCP client** — persistent connections, sub-second tool calls (not the 5-8s cold-start MCPorter workaround)
- **Recipes** — connect any webhook to any MCP tools via AI agents
- **Multiple recipes per webhook** — one Stripe webhook triggers invoice creation AND notification
- **BYOK** — bring your own API keys (Anthropic, OpenAI, OpenRouter, Ollama)
- **Self-hosted** — your data, your keys, your server

## Quick Start

```bash
npm install hooklaw
hooklaw init
# Edit hooklaw.config.yaml
hooklaw start
```

## How it works

1. Define **MCP servers** (Stripe, Conta Azul, GitHub, anything)
2. Create **recipes** that connect webhook → AI agent → MCP tools
3. Send webhooks to `POST /h/<slug>`
4. The AI agent processes the payload and uses MCP tools to take action

```yaml
mcp_servers:
  stripe:
    transport: stdio
    command: npx
    args: ["-y", "@stripe/agent-toolkit"]
  contaazul:
    transport: stdio
    command: npx
    args: ["-y", "contaazul-mcp"]

recipes:
  payment-to-invoice:
    description: "Auto-create invoice on Stripe payment"
    slug: stripe-payment          # POST /h/stripe-payment
    mode: async
    agent:
      provider: anthropic
      model: claude-sonnet-4-20250514
      temperature: 0.1
      instructions: |
        When a Stripe payment succeeds, create a Conta Azul invoice
        with the customer details and amount.
    tools: [stripe, contaazul]    # MCP servers this recipe can use
```

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/h/:slug` | Receive webhook |
| `GET` | `/health` | Health check |
| `GET` | `/api/recipes` | List all recipes |
| `GET` | `/api/recipes/:id/executions` | Recipe execution history |
| `GET` | `/api/webhooks/:slug/executions` | Webhook execution history |

## Supported Providers

| Provider | Key | Notes |
|----------|-----|-------|
| Anthropic | `anthropic` | Claude models |
| OpenAI | `openai` | GPT models |
| OpenRouter | `openrouter` | Multi-model gateway |
| Ollama | `ollama` | Local models |

## Examples

- [`examples/stripe-to-contaazul`](examples/stripe-to-contaazul) — Stripe payment → Conta Azul invoice via MCP
- [`examples/github-summary`](examples/github-summary) — GitHub push/PR summarizer

## Development

```bash
npm install
npm test          # 60 tests
npm run dev       # start with tsx
```

## License

MIT
