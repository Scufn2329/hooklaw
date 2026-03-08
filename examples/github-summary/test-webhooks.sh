#!/bin/bash
# Test webhooks against a running HookLaw instance
# Usage: ./test-webhooks.sh [port]

PORT=${1:-3007}
BASE="http://localhost:$PORT"

echo "=== Testing HookLaw at $BASE ==="
echo ""

# Health check
echo "--- Health Check ---"
curl -s "$BASE/health" | jq .
echo ""

# List hooks
echo "--- List Hooks ---"
curl -s "$BASE/api/hooks" | jq .
echo ""

# Simulate GitHub push webhook
echo "--- GitHub Push Webhook (sync) ---"
curl -s -X POST "$BASE/h/github-push" \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "refs/heads/main",
    "pusher": { "name": "lucianfialho", "email": "lucian@example.com" },
    "repository": { "full_name": "lucianfialho/hooklaw", "html_url": "https://github.com/lucianfialho/hooklaw" },
    "commits": [
      {
        "id": "abc123",
        "message": "feat: add MCP server support for tool integration",
        "author": { "name": "Lucian", "username": "lucianfialho" },
        "timestamp": "2026-03-08T12:00:00Z",
        "added": ["src/mcp.ts"],
        "modified": ["src/router.ts", "src/agent.ts"]
      },
      {
        "id": "def456",
        "message": "test: add router and server tests",
        "author": { "name": "Lucian", "username": "lucianfialho" },
        "timestamp": "2026-03-08T12:05:00Z",
        "added": ["src/router.test.ts"],
        "modified": ["src/server.test.ts"]
      }
    ],
    "head_commit": {
      "id": "def456",
      "message": "test: add router and server tests"
    }
  }' | jq .
echo ""

# Simulate GitHub PR webhook
echo "--- GitHub PR Webhook (sync) ---"
curl -s -X POST "$BASE/h/github-pr" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "opened",
    "number": 42,
    "pull_request": {
      "title": "Add webhook orchestration with AI agents",
      "user": { "login": "lucianfialho" },
      "html_url": "https://github.com/lucianfialho/hooklaw/pull/42",
      "body": "This PR adds the core webhook processing pipeline with AI agent integration and MCP tool support.",
      "head": { "ref": "feature/webhook-agents" },
      "base": { "ref": "main" },
      "additions": 1250,
      "deletions": 45,
      "changed_files": 15
    },
    "repository": { "full_name": "lucianfialho/hooklaw" }
  }' | jq .
echo ""

# Check executions
echo "--- Execution History (github-push) ---"
curl -s "$BASE/api/hooks/github-push/executions?limit=5" | jq .
echo ""

echo "--- Execution History (github-pr) ---"
curl -s "$BASE/api/hooks/github-pr/executions?limit=5" | jq .
echo ""

echo "=== Done ==="
