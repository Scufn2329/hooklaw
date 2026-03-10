# hooklaw

Event-driven AI agents with native MCP tools. Webhooks & RSS feeds in. MCP tools out. AI agent in the middle.

```
Stripe webhook  ──→  Recipe  ──→  QuickBooks MCP (create invoice)
GitHub webhook  ──→  Recipe  ──→  Slack MCP (post message)
HN RSS feed     ──→  Recipe  ──→  Slack MCP (daily digest)
Any event       ──→  Recipe  ──→  Any MCP server
```

This is the main package that re-exports `@lucianfialho/hooklaw-core` and `@lucianfialho/hooklaw-cli`.

## Quick Start

```bash
npx hooklaw start
```

No config file? HookLaw launches an **interactive setup wizard** in your browser — pick a provider, choose an event source, select integrations, and you're running.

Or install globally:

```bash
npm install -g hooklaw
hooklaw start
```

## Features

- **Multi-agent chains** — recipes trigger other recipes on success/error
- **Human-in-the-loop** — agents pause for approval before proceeding
- **Agent memory** — conversation context persists across executions
- **Conditional routing** — AI evaluates which recipe handles each event
- **Agent observability** — full traces of LLM calls, tool calls, and results
- **RSS/Atom feeds** — poll feeds as event sources with deduplication
- **Native MCP client** — persistent connections via `@modelcontextprotocol/sdk`
- **Config-as-code** — one YAML file, versionable in git
- **Built-in dashboard** — manage recipes, executions, MCP servers, and feeds

## Configuration

```yaml
server:
  port: 3007

providers:
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}

mcp_servers:
  slack:
    transport: stdio
    command: npx
    args: ["-y", "@anthropic/mcp-server-slack"]

recipes:
  pr-review:
    description: "Review PRs and post feedback"
    slug: github
    mode: async
    agent:
      provider: anthropic
      model: claude-sonnet-4-6
      instructions: "Review the PR and provide feedback."
      memory:
        enabled: true
        window_size: 10
    tools: [github]
    chain:
      on_success: [notify-slack]
    approval:
      enabled: true

logs:
  retention_days: 30
```

## Documentation

Full documentation at [github.com/lucianfialho/hooklaw](https://github.com/lucianfialho/hooklaw).

## License

MIT
