# Publicação do piloto do Robô SDR no Render

Este ambiente é uma homologação pública para o teste do cliente. Ele executa com
`NODE_ENV=production`, mas continua usando somente o Supabase de desenvolvimento
escolhido explicitamente durante a criação do Blueprint.

## Antes de criar o Blueprint

- Suba as alterações para um repositório Git acessível pelo Render.
- Tenha um número de WhatsApp dedicado ao SDR.
- Confirme que todas as migrations do SDR estão no Supabase de desenvolvimento.
- Tenha as credenciais da OpenAI, Kommo, catálogo, Resend e Supabase.
- Não copie `sdr/.env.local` para o Render.

## Serviços criados

- `traco-sdr-api`: API pública e webhook do WAHA.
- `traco-sdr-worker`: processamento assíncrono das conversas.
- `traco-sdr-queue`: Redis/Key Value persistente.
- `traco-sdr-waha`: serviço privado com sessão persistente.
- `traco-sdr-retention`: limpeza diária conforme a política de retenção.

Todos os serviços devem permanecer na mesma região (`ohio`) para usarem a rede
privada do Render.

O WAHA usa o plano `standard` (2 GB/1 CPU) durante o piloto. Monitore memória e
CPU; para a operação definitiva, a recomendação oficial do WAHA é uma máquina
com 2 CPU e 4 GB de RAM (plano `pro` no Render).

## Valores solicitados pelo Render

Preencha os mesmos valores de Supabase, catálogo, OpenAI, Resend e Kommo tanto na
API quanto no worker. O cron de retenção precisa somente do Supabase.

### API

- `FRONTEND_ORIGIN`: origem HTTPS exata do frontend, sem caminho.
- `SUPABASE_URL`: URL do projeto de desenvolvimento usado no piloto.
- `SUPABASE_SERVICE_ROLE_KEY`: Secret/service role desse mesmo projeto.
- `CATALOG_PROVIDER_NAME`: nome mostrado para o catálogo.
- `CATALOG_BASE_URL`: endereço base da API de cursos.
- `CATALOG_API_KEY`: chave do endpoint de cursos.
- `OPENAI_API_KEY`: chave exclusiva do SDR.
- `RESEND_API_KEY`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`: alerta crítico.
- todas as credenciais, etapas, campos, responsável e tipo de tarefa do Kommo.

### Worker

Repita os valores de Supabase, catálogo, OpenAI, Resend e Kommo informados na API.
API e worker precisam apontar para o mesmo banco, funil e conta Kommo.

### WAHA

- `WAHA_API_KEY`: gere uma chave longa e exclusiva.
- `WHATSAPP_HOOK_URL`: depois que a API existir, use
  `https://traco-sdr-api.onrender.com/webhooks/waha`, ajustando o domínio caso o
  Render gere outro endereço.

O HMAC do webhook é gerado pelo Blueprint e compartilhado internamente com API e
worker. A sessão fica no disco `/app/.sessions`.

### Retenção

- `SUPABASE_URL`: a mesma URL da API.
- `SUPABASE_SERVICE_ROLE_KEY`: a mesma Secret/service role da API.

## Depois do deploy

1. Abra `https://URL-DA-API/health` e confirme HTTP 200.
2. Configure no frontend `VITE_SDR_API_URL=https://URL-DA-API` e publique-o.
3. Abra a configuração do SDR, gere o QR Code e conecte o número dedicado.
4. Envie uma mensagem de outro telefone.
5. Confirme resposta no WhatsApp e criação do card em `Novo Lead` no Kommo.
6. Peça atendimento humano e confirme etapa, tarefa, nota e notificação.
7. Teste o alerta crítico de e-mail.
8. Monitore os logs da API, worker, WAHA e fila durante todo o piloto.

## Segurança do piloto

- `SDR_TEST_ALLOWED_PHONE_NUMBERS` não deve ser criada no Render.
- Nunca use variáveis com prefixo `VITE_` para secrets.
- Não conecte um WhatsApp pessoal: em produção, qualquer remetente pode acionar o
  robô.
- Se o piloto precisar ser restrito a poucas pessoas, implemente uma allowlist de
  homologação antes de compartilhar o número.
