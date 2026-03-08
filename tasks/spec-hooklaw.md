# HookLaw — Specification

**Version:** 0.1.0
**License:** MIT
**Date:** 2026-03-08

---

## 1. Problem Statement

### O que estamos resolvendo?

Automações atuais (Zapier, Make, n8n) são baseadas em regras rígidas: "se campo X = Y, faça Z". Quando o payload muda, a automação quebra. Quando a decisão exige contexto, o usuário precisa criar árvores de condições impossíveis de manter.

Agentes AI resolvem isso — entendem contexto, interpretam payloads variáveis e decidem o que fazer. Mas hoje não existe uma forma simples de conectar um webhook a um agente AI com ferramentas MCP.

### Por que agora?

- MCP está se tornando o padrão de ferramentas para agentes AI
- BYOK elimina o custo de LLM pro operador — o usuário paga direto
- Webhooks são o trigger universal — todo SaaS emite
- Não existe um "webhook → agente AI → MCP tools" open source, self-hosted e simples

### O que é HookLaw?

Uma plataforma self-hosted (single process, Node.js) onde o usuário:
1. Cria **hooks** (recebe URLs únicas)
2. Configura **agentes AI** para processar os payloads
3. Conecta **MCP servers** como ferramentas de ação
4. Traz suas **próprias API keys** (BYOK)

---

## 2. User Stories

### US-1: Criar um Hook

> Como usuário, quero criar um hook e receber uma URL única para que eu possa colar num serviço externo e começar a receber eventos.

**Acceptance Criteria:**
- [ ] Usuário cria hook via CLI ou API
- [ ] Sistema gera URL única (ex: `http://localhost:3000/h/<hook_id>`)
- [ ] Hook aceita POST com qualquer payload JSON
- [ ] Hook responde 200 imediatamente (processamento async)
- [ ] Hook tem um nome/label definido pelo usuário
- [ ] Hook pode ser ativado/desativado

---

### US-2: Configurar um Agente para um Hook

> Como usuário, quero configurar um agente AI associado a um hook, definindo system prompt, modelo e comportamento, para que ele processe os payloads automaticamente.

**Acceptance Criteria:**
- [ ] Cada hook tem exatamente um agente associado
- [ ] Agente tem: system prompt, modelo (ex: `claude-sonnet-4`), temperatura
- [ ] System prompt pode referenciar o payload via template (ex: `{{payload}}`)
- [ ] Agente recebe o payload completo como contexto
- [ ] Configuração via arquivo YAML/JSON no filesystem

---

### US-3: Conectar MCP Servers como Tools

> Como usuário, quero conectar MCP servers ao meu agente para que ele possa executar ações (criar issue, enviar mensagem, atualizar banco, etc).

**Acceptance Criteria:**
- [ ] Usuário configura MCP servers por agente (stdio command ou SSE URL)
- [ ] Agente descobre tools disponíveis via MCP protocol
- [ ] Agente pode chamar tools durante processamento do webhook
- [ ] Suporte a MCP servers locais (stdio) e remotos (SSE/streamable HTTP)
- [ ] Marketplace de presets: configs prontas para MCP servers populares (Notion, Slack, Linear, GitHub, etc.)

---

### US-4: BYOK (Bring Your Own Key)

> Como usuário, quero usar minhas próprias API keys de LLM para que eu controle custos e providers diretamente.

**Acceptance Criteria:**
- [ ] Configuração de API keys via `.env` ou config file
- [ ] Suporte a múltiplos providers: Anthropic, OpenAI, OpenRouter, Ollama (local)
- [ ] Provider configurável por agente (hook A usa Claude, hook B usa GPT)
- [ ] Keys nunca logadas ou expostas em responses

---

### US-5: Logs de Execução

> Como usuário, quero ver o histórico de execuções de cada hook para debugar e entender o que o agente fez.

**Acceptance Criteria:**
- [ ] Cada execução registra: timestamp, payload recebido, decisão do agente, tools chamadas, resultado
- [ ] Logs persistidos em SQLite
- [ ] Consulta via CLI: `hooklaw logs <hook_id>`
- [ ] Consulta via API: `GET /api/hooks/<hook_id>/logs`
- [ ] Retenção configurável (default: 30 dias)

---

### US-6: Execução Síncrona e Assíncrona

> Como usuário, quero escolher se o hook processa síncrono (responde com resultado) ou assíncrono (responde 200 e processa em background).

**Acceptance Criteria:**
- [ ] Modo `async` (default): responde 200 imediato, processa em background
- [ ] Modo `sync`: segura o request, processa, retorna resultado do agente (timeout configurável, default 30s)
- [ ] Modo configurável por hook
- [ ] Modo sync retorna JSON com output do agente

---

### US-7: Gestão via CLI

> Como usuário, quero gerenciar hooks, agentes e configurações via CLI para setup rápido e automação.

**Acceptance Criteria:**
- [ ] `hooklaw init` — inicializa projeto (cria config, SQLite, dirs)
- [ ] `hooklaw hook create <name>` — cria hook, retorna URL
- [ ] `hooklaw hook list` — lista hooks
- [ ] `hooklaw hook delete <id>` — remove hook
- [ ] `hooklaw hook test <id> --payload '{...}'` — dispara teste local
- [ ] `hooklaw start` — sobe o servidor
- [ ] `hooklaw logs <hook_id>` — mostra logs de execução
- [ ] `hooklaw status` — mostra status geral (hooks ativos, server, etc)

---

### US-8: API REST para Gestão

> Como usuário, quero uma API REST para gerenciar hooks programaticamente e integrar com dashboards.

**Acceptance Criteria:**
- [ ] `POST /api/hooks` — cria hook
- [ ] `GET /api/hooks` — lista hooks
- [ ] `GET /api/hooks/:id` — detalhes do hook
- [ ] `DELETE /api/hooks/:id` — remove hook
- [ ] `PATCH /api/hooks/:id` — atualiza config do hook
- [ ] `GET /api/hooks/:id/logs` — logs de execução
- [ ] `POST /api/hooks/:id/test` — dispara teste
- [ ] Autenticação via bearer token configurável

---

## 3. Arquitetura

### Visão Geral

```
                    ┌─────────────────────────────┐
                    │         HookLaw              │
                    │    (single Node.js process)   │
                    │                               │
  Webhook POST ───▶│  Router ──▶ Queue ──▶ Agent   │
  /h/<hook_id>     │              │         │       │
                    │              │    ┌────┘       │
                    │              ▼    ▼            │
                    │           SQLite  MCP Tools    │
                    │           (logs)  (actions)    │
                    │                               │
                    │  CLI ◀──▶ Config (YAML/JSON)  │
                    │  API ◀──▶ SQLite              │
                    └─────────────────────────────┘
```

### Stack Técnica

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 20+ (single process) |
| Linguagem | TypeScript |
| Database | SQLite (better-sqlite3) |
| AI SDK | Anthropic SDK / OpenAI SDK |
| MCP Client | @modelcontextprotocol/sdk |
| Config | YAML (yaml) |
| Validation | Zod |
| Logging | pino |
| Queue | In-process (por hook, concurrency control) |
| CLI | Commander.js ou similar |

### Estrutura de Diretório

```
hooklaw/
├── src/
│   ├── index.ts              # Entry point + server
│   ├── server.ts             # HTTP server (webhook receiver + API)
│   ├── router.ts             # Rota webhooks para agentes
│   ├── queue.ts              # Fila por hook com concurrency
│   ├── agent.ts              # Invocação do agente AI
│   ├── mcp-client.ts         # Cliente MCP (stdio + SSE)
│   ├── config.ts             # Carrega e valida config
│   ├── db.ts                 # SQLite (hooks, logs, state)
│   ├── cli.ts                # CLI commands
│   ├── providers/
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── openrouter.ts
│   │   └── ollama.ts
│   └── types.ts              # Tipos compartilhados
├── hooklaw.config.yaml       # Config principal
├── .env                      # API keys (BYOK)
├── package.json
├── tsconfig.json
└── README.md
```

### Config File (hooklaw.config.yaml)

```yaml
server:
  port: 3000
  host: "0.0.0.0"
  auth_token: "optional-bearer-token-for-api"

providers:
  anthropic:
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    api_key: ${OPENAI_API_KEY}
  openrouter:
    api_key: ${OPENROUTER_API_KEY}
  ollama:
    base_url: "http://localhost:11434"

hooks:
  github-pr-review:
    enabled: true
    mode: async            # async | sync
    agent:
      provider: anthropic
      model: claude-sonnet-4
      temperature: 0.3
      system_prompt: |
        You are a code review assistant.
        When you receive a GitHub webhook payload for a pull request,
        analyze the changes and create a review comment.

        Use the available tools to:
        1. Read the PR diff
        2. Post a review comment on GitHub
    mcp_servers:
      - name: github
        transport: stdio
        command: npx
        args: ["-y", "@modelcontextprotocol/server-github"]
        env:
          GITHUB_TOKEN: ${GITHUB_TOKEN}

  stripe-payment:
    enabled: true
    mode: async
    agent:
      provider: openai
      model: gpt-4o
      system_prompt: |
        You receive Stripe payment webhooks.
        When a payment succeeds, notify the team on Slack
        and create a record in Notion.
    mcp_servers:
      - name: slack
        transport: stdio
        command: npx
        args: ["-y", "@modelcontextprotocol/server-slack"]
        env:
          SLACK_BOT_TOKEN: ${SLACK_BOT_TOKEN}
      - name: notion
        transport: sse
        url: "http://localhost:3001/sse"

mcp_presets:
  github:
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    required_env: ["GITHUB_TOKEN"]
  slack:
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-slack"]
    required_env: ["SLACK_BOT_TOKEN"]
  notion:
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-notion"]
    required_env: ["NOTION_API_KEY"]
  linear:
    transport: stdio
    command: npx
    args: ["-y", "mcp-linear"]
    required_env: ["LINEAR_API_KEY"]

logs:
  retention_days: 30
```

---

## 4. Modelo de Dados (SQLite)

### hooks

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | UUID do hook |
| name | TEXT | Nome/label |
| slug | TEXT UNIQUE | Slug na URL (/h/<slug>) |
| enabled | BOOLEAN | Ativo/inativo |
| mode | TEXT | "async" ou "sync" |
| config_ref | TEXT | Referência ao bloco de config YAML |
| created_at | DATETIME | Criação |
| updated_at | DATETIME | Última atualização |

### executions

| Campo | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | UUID da execução |
| hook_id | TEXT FK | Hook que disparou |
| status | TEXT | "pending", "running", "success", "error" |
| payload | TEXT | Payload JSON recebido |
| agent_output | TEXT | Output do agente |
| tools_called | TEXT | JSON array de tools usadas |
| duration_ms | INTEGER | Tempo de execução |
| error | TEXT | Erro se houver |
| created_at | DATETIME | Timestamp |

---

## 5. Fluxo de Execução

```
1. POST /h/<slug> chega com payload JSON
2. Server valida que o hook existe e está enabled
3. Responde 200 (async) ou segura (sync)
4. Enfileira na queue do hook (concurrency: 1 por hook default)
5. Worker pega da fila:
   a. Carrega config do agente (prompt, modelo, provider)
   b. Inicializa MCP clients (stdio spawn ou SSE connect)
   c. Monta prompt: system_prompt + payload formatado
   d. Chama LLM com tools disponíveis via MCP
   e. LLM decide e chama tools conforme necessário
   f. Salva execution log no SQLite
6. Se modo sync: retorna output para o caller
7. MCP clients são cleanup (stdio kill, SSE disconnect)
```

---

## 6. Non-Goals (O que NÃO estamos construindo)

- **Dashboard web** — v1 é CLI + API + config file. UI vem depois.
- **Multi-tenancy** — uma instância = um usuário. Sem auth de múltiplos users.
- **Workflow builder visual** — sem drag-and-drop. Config é YAML.
- **Message channels** (Telegram, Slack como input) — input é webhook only.
- **Container isolation** — agentes rodam no mesmo processo (simplicidade > isolação na v1).
- **Billing/metering** — BYOK, sem cobrança.
- **Webhook signature verification** — v1 aceita qualquer POST. Signature validation é enhancement futuro.

---

## 7. Open Questions

| # | Questão | Impacto |
|---|---|---|
| 1 | MCP server lifecycle: spawn por execução ou manter vivo (pool)? Spawn é mais seguro, pool é mais rápido. | Performance vs resource usage |
| 2 | Retry policy: se o agente falha (LLM timeout, MCP tool error), retry automático? Quantas vezes? | Reliability |
| 3 | Secret management: `.env` basta ou precisamos de algo como encrypted config? | Security |
| 4 | Rate limiting por hook: prevenir abuse se alguém spammar a URL? | Stability |
| 5 | Payload size limit: qual o max aceitável? (Stripe webhooks podem ser grandes) | Resource usage |
| 6 | Streaming: agente deve poder streamer output em modo sync? Ou só resposta final? | API design |

---

## 8. Milestones

### M1 — Core (MVP)
- Server HTTP recebe webhooks
- Config YAML com hooks e agentes
- Invocação de agente com payload
- BYOK (Anthropic + OpenAI)
- SQLite para logs
- CLI básico (init, start, hook create/list/delete, logs)

### M2 — MCP Integration
- MCP client (stdio + SSE)
- Tools disponíveis para o agente
- MCP presets para servers populares
- Hook test command

### M3 — Polish
- API REST completa
- Modo sync/async por hook
- Queue com concurrency control
- Retry policy configurável
- Docs completos

### M4 — Community
- Plugin system para custom providers
- Webhook signature verification (GitHub, Stripe, etc.)
- Templates de hooks prontos
- Dashboard web (opcional, separado)
