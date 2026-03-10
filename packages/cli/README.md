# @lucianfialho/hooklaw-cli

CLI for [HookLaw](https://github.com/lucianfialho/hooklaw) — event-driven AI agents with native MCP tools.

## Commands

### `hooklaw start`

Start the HookLaw server. If no `hooklaw.config.yaml` exists, launches an interactive setup wizard in your browser.

```bash
hooklaw start
hooklaw start --verbose    # enable debug logging
hooklaw start --port 4000  # custom port
```

### `hooklaw init`

Create a starter `hooklaw.config.yaml` in the current directory.

```bash
hooklaw init
```

### `hooklaw doctor`

Diagnose your HookLaw setup — checks config, providers, MCP servers, and database.

```bash
hooklaw doctor
```

## Install

Usually installed via the main `hooklaw` package:

```bash
npm install -g hooklaw
```

Or standalone:

```bash
npm install @lucianfialho/hooklaw-cli
```

## License

MIT
