# @lucianfialho/hooklaw-dashboard

Web dashboard for [HookLaw](https://github.com/lucianfialho/hooklaw) — event-driven AI agents with native MCP tools.

Built with React, Vite, React Router, and Tailwind CSS.

## Features

- **Recipes** — view, edit instructions/model, create new recipes with guided wizard
- **Executions** — real-time execution logs with payload, agent output, and traces
- **MCP Servers** — health checks, tool discovery, package installation, add new servers
- **Feeds** — monitor active RSS/Atom feed pollers and their status
- **Approvals** — review and approve/reject pending human-in-the-loop executions
- **Config** — visual YAML config viewer with syntax highlighting
- **Setup Wizard** — guided onboarding for first-time users (webhook or RSS source)

## Development

```bash
cd packages/dashboard
pnpm dev        # dev server with HMR
pnpm build      # production build
```

The dashboard is served automatically by the HookLaw server at `/dashboard/`.

## License

MIT
