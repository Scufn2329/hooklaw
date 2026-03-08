# Example: GitHub Webhook Summarizer

Receives GitHub push and PR webhooks, uses an AI agent to generate summaries.

## Setup

```bash
# From the hooklaw root
cd examples/github-summary

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
npx tsx ../../src/cli.ts start -c hooklaw.config.yaml
```

## Test

In another terminal:

```bash
cd examples/github-summary
./test-webhooks.sh
```

## Hooks

| Hook | Mode | Description |
|------|------|-------------|
| `github-push` | sync | Summarizes push events (commits, branch, author) |
| `github-pr` | sync | Summarizes PR events (title, action, review priority) |

## Connect to GitHub

In your GitHub repo settings, add webhooks pointing to:

```
http://your-server:3007/h/github-push   (push events)
http://your-server:3007/h/github-pr     (pull request events)
```
