# @lucianfialho/hooklaw-core

Core engine for [HookLaw](https://github.com/lucianfialho/hooklaw) — event-driven AI agents with native MCP tools.

## What's inside

- **Config loader** — YAML config with `${ENV_VAR}` substitution and Zod validation
- **HTTP server** — webhook receiver (`POST /h/:slug`), REST API, and dashboard hosting
- **Router** — recipe matcher with conditional routing via lightweight LLM evaluation
- **Agent** — agentic tool loop (max 10 iterations) with observability traces
- **MCP Pool** — persistent MCP client connections (stdio + SSE transports)
- **SQLite DB** — executions, traces, agent memory, approvals (WAL mode)
- **Feed poller** — RSS/Atom/JSON feed watcher with content-hash deduplication
- **Queue** — per-recipe async queue with concurrency control
- **Provider registry** — pluggable LLM providers (OpenAI, Anthropic, Ollama, OpenRouter)

## Key Features

- **Multi-agent chains** — recipes trigger other recipes on success/error with depth tracking
- **Human-in-the-loop** — executions pause at `pending_approval` status for review
- **Agent memory** — conversation context persists across executions per recipe
- **Conditional routing** — LLM evaluates conditions to decide which recipe handles an event
- **Agent observability** — traces capture every LLM call, tool call, tool result, and error

## Install

```bash
npm install @lucianfialho/hooklaw-core
```

## Usage

```typescript
import { bootstrap } from '@lucianfialho/hooklaw-core';

const { server, config } = await bootstrap({
  configPath: './hooklaw.config.yaml',
  dashboardDir: './dashboard/dist',
});
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/h/:slug` | Receive webhook |
| `GET` | `/api/recipes` | List recipes |
| `GET` | `/api/executions` | List executions (filterable) |
| `GET` | `/api/executions/:id/traces` | Agent reasoning traces |
| `GET` | `/api/executions/:id/chain` | Child executions in a chain |
| `GET` | `/api/recipes/:id/memory` | Agent memory for a recipe |
| `DELETE` | `/api/recipes/:id/memory` | Clear agent memory |
| `GET` | `/api/approvals` | Pending approval queue |
| `POST` | `/api/executions/:id/approve` | Approve/reject execution |
| `GET` | `/api/mcp-servers` | List MCP servers |
| `GET` | `/api/mcp-servers/health` | Health check all MCP servers |
| `GET` | `/api/stats` | Execution statistics |
| `GET` | `/api/feeds` | Active feed pollers |
| `GET` | `/api/config` | Redacted config |

## Architecture

```
hooklaw.config.yaml
        |
        v
┌──────────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  HTTP Server │────>│  Router  │────>│   Agent   │────>│ MCP Pool │
│  /h/:slug    │     │  Routing │     │  Tool Loop│     │  stdio   │
│  /api/*      │     │  Chains  │     │  Traces   │     │  sse     │
│  /dashboard  │     │  Memory  │     │  Memory   │     │          │
└──────────────┘     └──────────┘     └───────────┘     └──────────┘
        ^                  |                                   |
        |                  v                                   v
┌──────────────┐     ┌──────────┐                        ┌──────────┐
│  RSS/Atom    │     │  SQLite  │                        │ External │
│  Feed Poller │     │  (WAL)   │                        │ MCP Svrs │
└──────────────┘     └──────────┘                        └──────────┘
```

## License

MIT
