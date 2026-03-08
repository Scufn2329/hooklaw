#!/bin/bash
# Simulate a Stripe payment.succeeded webhook
# Usage: ./test-webhook.sh [port]

PORT=${1:-3007}
BASE="http://localhost:$PORT"

echo "=== Stripe → Conta Azul via HookLaw ==="
echo ""

echo "--- Recipes ---"
curl -s "$BASE/api/recipes" | jq .
echo ""

echo "--- Sending Stripe payment.succeeded webhook ---"
curl -s -X POST "$BASE/h/stripe-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_1234567890",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_3ABC123",
        "amount": 15000,
        "currency": "brl",
        "status": "succeeded",
        "customer": "cus_ABC123",
        "charges": {
          "data": [{
            "id": "ch_ABC123",
            "amount": 15000,
            "billing_details": {
              "name": "João Silva",
              "email": "joao@example.com"
            },
            "payment_method_details": {
              "type": "card",
              "card": { "brand": "visa", "last4": "4242" }
            }
          }]
        },
        "metadata": {
          "order_id": "ORD-2026-001"
        }
      }
    },
    "created": 1709913600
  }' | jq .
echo ""

# Wait for async processing
sleep 2

echo "--- Execution History ---"
curl -s "$BASE/api/webhooks/stripe-payment/executions?limit=5" | jq .
echo ""

echo "--- Recipe: payment-to-invoice ---"
curl -s "$BASE/api/recipes/payment-to-invoice/executions?limit=5" | jq .
echo ""

echo "--- Recipe: payment-notification ---"
curl -s "$BASE/api/recipes/payment-notification/executions?limit=5" | jq .
echo ""

echo "=== Done ==="
