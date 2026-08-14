# ADR-001 — Arquitetura do Robô SDR

- Status: Aceito para MVP
- História: US-01 — Arquitetura e Infraestrutura do Robô SDR
- Data: 2026-07-30

## Contexto

A Traço precisa de uma fundação segura para um SDR automatizado focado em cursos.
O sistema deve receber mensagens do WhatsApp, agrupar mensagens enviadas em
sequência, manter o contexto isolado por lead, gerar respostas com IA, registrar
auditoria e interromper a automação quando for necessária intervenção humana.

## Decisão

O SDR será um serviço separado do frontend atual:

1. O WAHA recebe e envia mensagens do WhatsApp.
2. Um Web Service Node.js/TypeScript recebe webhooks do WAHA.
3. O webhook valida HMAC, deduplica pelo ID da mensagem, persiste o evento no
   Supabase e enfileira a conversa.
4. BullMQ e um serviço Redis/Valkey aplicam o debounce configurável por conversa.
5. Um Background Worker carrega somente o histórico da conversa enfileirada,
   chama a Responses API da OpenAI e envia a resposta pelo WAHA.
6. O Supabase/Postgres armazena leads, conversas, mensagens, handoffs,
   notificações e eventos de auditoria.
7. Um adaptador de notificações envia alertas a um webhook interno. O canal
   definitivo (Slack, Teams ou e-mail) permanece configurável.

## Componentes

```text
WhatsApp
   │
   ▼
WAHA ──webhook/HMAC──► SDR API (Render Web Service)
                           │
               ┌───────────┴───────────┐
               ▼                       ▼
       Supabase/Postgres        Redis/Valkey + BullMQ
                                       │
                                       ▼
                              SDR Worker (Render)
                               │       │       │
                               ▼       ▼       ▼
                            OpenAI    WAHA   Notificações
```

## Limites de segurança

- Segredos existem apenas em variáveis de ambiente ou no secret manager do
  provedor de hospedagem.
- O webhook do WAHA exige HMAC SHA-512 sobre o corpo bruto.
- Chamadas à API do WAHA exigem `X-Api-Key`.
- O `SUPABASE_SERVICE_ROLE_KEY` nunca pode ser enviado ao navegador.
- Cada job transporta apenas `conversationId`; o worker busca o contexto no
  banco usando esse identificador.
- `provider_message_id` é único e torna o recebimento idempotente.
- Conversas em `waiting_human` ou `human_active` não recebem respostas da IA.
- Falhas de IA nunca geram uma mensagem improvisada para o lead.

## Memória

- Postgres é a fonte de verdade e mantém histórico permanente.
- Redis/Valkey contém apenas fila, debounce e locks temporários.
- O contexto enviado à IA é limitado às mensagens da conversa atual.
- O número normalizado do WhatsApp identifica o lead, mas todas as relações
  internas usam UUIDs.

## Delay

O delay padrão é de oito segundos, controlado por
`SDR_RESPONSE_DELAY_MS`. Uma nova mensagem recebida durante a espera substitui
o job atrasado da mesma conversa.

## Intervenção humana inicial

O bot solicita handoff quando:

- o lead pede explicitamente uma pessoa;
- o lead quer matricular, pagar, negociar ou solicitar desconto;
- há reclamação, cancelamento, reembolso ou tema sensível;
- a pergunta não pode ser respondida com segurança;
- ocorrem falhas repetidas;
- OpenAI ou WAHA estão indisponíveis.

Estados possíveis: `bot_active`, `waiting_human`, `human_active`, `resolved` e
`closed`.

## Decisões de tecnologia

| Responsabilidade | Tecnologia |
|---|---|
| API e worker | Node.js + TypeScript |
| API HTTP | Fastify |
| Fila e delay | BullMQ + Redis/Valkey |
| Banco e auditoria | Supabase/Postgres |
| WhatsApp | WAHA |
| IA | OpenAI Responses API |
| Modelo inicial | `gpt-5.6-terra` |
| Hospedagem | Render |
| Notificação | Webhook configurável; Slack/Teams preferencial |

## Consequências

- API e worker podem ser implantados e escalados separadamente.
- O WAHA precisa de armazenamento persistente para preservar a sessão.
- Redis indisponível impede processamento, mas não perde mensagens já
  persistidas.
- A integração WAHA deve ser monitorada porque depende de uma sessão ativa do
  WhatsApp.
- Antes da produção é obrigatório escolher e testar o canal de notificação.

