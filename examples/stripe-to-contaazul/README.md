# Example: Stripe → Conta Azul Invoice

The killer recipe: when Stripe sends a `payment.succeeded` webhook, the AI agent automatically creates an invoice in Conta Azul.

```
Stripe webhook  ──→  HookLaw  ──→  Conta Azul MCP
(payment.succeeded)    │              (create invoice)
                       │
                       ├──→  Stripe MCP
                       │     (get customer details)
                       │
                       └──→  AI Agent
                             (orchestrates the flow)
```

## Two recipes, one webhook

This example shows **multiple recipes on the same webhook slug** — a key HookLaw feature:

| Recipe | What it does |
|--------|-------------|
| `payment-to-invoice` | Uses Stripe + Conta Azul MCPs to create an invoice |
| `payment-notification` | Simple log/summary (no MCP tools needed) |

Both trigger when `POST /h/stripe-payment` receives data.

## Setup

```bash
# Set your keys
export ANTHROPIC_API_KEY=sk-ant-...
export STRIPE_SECRET_KEY=sk_test_...
export CONTAAZUL_TOKEN=...

# Start
cd examples/stripe-to-contaazul
npx tsx ../../src/cli.ts start -c hooklaw.config.yaml
```

## Test

```bash
./test-webhook.sh
```

## Connect to Stripe

In your Stripe Dashboard → Developers → Webhooks:

```
Endpoint URL: https://your-server:3007/h/stripe-payment
Events: payment_intent.succeeded
```
