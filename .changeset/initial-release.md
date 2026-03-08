---
"hooklaw": minor
---

Initial release: webhook orchestrator with AI agents and native MCP tools.

- Recipes connect webhooks to MCP servers via AI agents
- Native MCP client with persistent connections (stdio + SSE)
- Multiple recipes per webhook slug
- Sync and async processing modes
- BYOK: Anthropic, OpenAI, OpenRouter, Ollama
- REST API for recipes and execution history
- SQLite execution logging with retention cleanup
- CLI with `init` and `start` commands
