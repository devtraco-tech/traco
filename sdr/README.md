# Robô SDR da Traço

Infraestrutura inicial da US-01. Este pacote é separado do painel React para que
segredos de servidor nunca sejam enviados ao navegador.

## O que já está implementado

- webhook `POST /webhooks/waha` com validação HMAC SHA-512;
- filtro de mensagens próprias, grupos, status e conteúdo vazio;
- persistência idempotente por ID da mensagem do WAHA;
- contexto isolado por lead e histórico permanente no Supabase;
- fila BullMQ com delay configurável;
- worker que consulta o catálogo de cursos e usa a Responses API da OpenAI;
- envio de resposta pelo endpoint `/api/sendText` do WAHA;
- regras de handoff humano e fallback em falhas de IA/WAHA;
- notificações por webhook e auditoria no banco;
- health check em `GET /health`.
- API administrativa autenticada para iniciar, consultar e desconectar a sessão
  WAHA e entregar o QR Code real ao painel.
- proxy autenticado para consultar `GET /wordpress-courses` da ABO, com cache de
  até 60 segundos e vínculo do SDR a um snapshot público do curso.

## Fluxo

```text
WhatsApp -> WAHA -> API SDR -> Supabase
                         \-> Render Key Value -> Worker
                                                |-> OpenAI
                                                |-> WAHA
                                                \-> Slack/Teams
```

O webhook apenas valida, grava e enfileira. O worker espera o delay e realiza o
trabalho mais lento. Isso impede que o WAHA fique aguardando a IA.

## 1. Aplicar o schema somente no Supabase de desenvolvimento

Antes de qualquer comando, confirme o projeto vinculado:

```bash
cat supabase/.temp/project-ref
```

O resultado esperado neste repositório é:

```text
yoqocelwzhhpzvlsbncq
```

Depois:

```bash
npx.cmd supabase db push --dry-run
```

Só execute `npx.cmd supabase db push` quando o `dry-run` listar apenas as
migrations que você realmente pretende aplicar. Se aparecer uma lista grande de
migrations antigas, pare e alinhe o histórico antes. Aplicar sem conferir pode
executar alterações antigas junto com o SDR.

A migration criada é
`supabase/migrations/20260730010000_create_sdr_infrastructure.sql`.

### Aplicação automática pelo GitHub

O workflow `.github/workflows/supabase-migrations.yml` executa, em cada push na
branch `main`, um `dry-run` e depois aplica somente as migrations pendentes no
Supabase de desenvolvimento. Ele recusa qualquer project ref diferente de
`yoqocelwzhhpzvlsbncq`.

Cadastre estes secrets em **GitHub > Settings > Secrets and variables > Actions**:

- `SUPABASE_ACCESS_TOKEN`: token pessoal criado em Supabase > Account > Access Tokens;
- `SUPABASE_DB_PASSWORD`: senha do banco do projeto de desenvolvimento;
- `SUPABASE_PROJECT_ID`: `yoqocelwzhhpzvlsbncq`.

No Railway, habilite **Wait for CI** em `api`, `worker` e `retention`. Assim, um
erro de migration impede o deploy desse commit. Nunca use `--include-seed` nesse
workflow e não faça alterações de schema diretamente pelo SQL Editor depois de
adotar esse fluxo, pois isso pode desalinhar o histórico de migrations.

## 2. Configuração local

Dentro de `sdr/`:

```bash
cp .env.example .env.local
npm.cmd install
```

No PowerShell, o equivalente da cópia é:

```powershell
Copy-Item .env.example .env.local
```

Preencha `.env.local`. Não cole nenhuma chave em commit, conversa ou código.

Para integrar uma fonte de cursos, configure `CATALOG_PROVIDER`,
`CATALOG_PROVIDER_NAME`, `CATALOG_BASE_URL`, `CATALOG_API_KEY` e
`CATALOG_COURSES_PATH`. O núcleo do SDR não conhece a marca ou o banco da
organização conectada. A chave do catálogo fica somente no backend e não usa
prefixo `VITE_`.

Para `SUPABASE_SERVICE_ROLE_KEY`, prefira uma **Secret key (`sb_secret_...`) do
projeto de desenvolvimento**, em Settings > API Keys. A variável mantém o nome
legado por compatibilidade, mas aceita a chave Secret atual. Ela é diferente da
chave pública usada pelo Vite e deve existir somente neste backend.

## 3. Redis e WAHA locais

Com Docker Desktop aberto, preencha primeiro `WAHA_API_KEY` e
`WAHA_WEBHOOK_HMAC_KEY` em `.env.local`. Use dois valores aleatórios diferentes.
Preencha também `SUPABASE_SERVICE_ROLE_KEY` com a Secret key do projeto
`abo-traco-dev`. A API usa essa chave apenas no servidor para validar o token e
o papel `admin` do usuário; ela nunca é enviada ao navegador.
Depois execute:

```bash
npm.cmd run infra:up
```

O Compose inicia Redis na porta `6379`, WAHA na porta `3000` e guarda a sessão
do WhatsApp em um volume persistente. Para acompanhar:

```bash
npm.cmd run infra:logs
```

## 4. Configurar o WAHA

O arquivo `docker-compose.local.yml` já configura:

- `WAHA_API_KEY` para proteger todos os endpoints do WAHA;
- `WHATSAPP_HOOK_HMAC_KEY` = `WAHA_WEBHOOK_HMAC_KEY`;
- webhook local: `http://host.docker.internal:10000/webhooks/waha`;
- eventos: `message`.

O backend espera o cabeçalho `X-Webhook-Hmac` gerado pelo WAHA e envia mensagens
com `X-Api-Key`.

### Conexão pelo painel

O frontend usa `VITE_SDR_API_URL` (por padrão `http://localhost:10000`) e envia o
token de sessão do Supabase ao backend. Somente contas com papel `admin` podem
usar estes endpoints:

- `GET /api/sdr/whatsapp/status`;
- `POST /api/sdr/whatsapp/start`;
- `GET /api/sdr/whatsapp/qr`;
- `POST /api/sdr/whatsapp/disconnect`.

O backend mantém `WAHA_API_KEY` em segredo e devolve ao navegador apenas estado,
identificação da conta conectada e a imagem base64 do QR Code. O painel consulta
o estado automaticamente até o WAHA informar `WORKING`.

Referências: [WAHA webhooks](https://waha.devlike.pro/docs/how-to/events/) e
[segurança do WAHA](https://waha.devlike.pro/docs/how-to/security/).

## 5. Rodar

Para testar apenas a conexão do painel, abra um terminal dentro de `sdr/`:

```bash
npm.cmd run dev:api
```

O worker pode ser iniciado em outro terminal quando a OpenAI estiver
configurada:

```bash
npm.cmd run dev:worker
```

Verificações:

```bash
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

## 6. Publicar no Render

O arquivo `render.yaml` cria:

- `traco-sdr-api` (web service);
- `traco-sdr-worker` (background worker);
- `traco-sdr-queue` (Render Key Value persistente);
- `traco-sdr-waha` (serviço privado com disco em `/app/.sessions`);
- `traco-sdr-retention` (rotina diária de retenção de dados).

Na criação do Blueprint, o Render solicitará os valores marcados com
`sync: false`. Para a homologação pública, informe conscientemente a URL e a
Secret/service role do Supabase de desenvolvimento. O Blueprint não contém nem
descobre credenciais do banco de produção da ABO.

`SDR_TEST_ALLOWED_PHONE_NUMBERS` é exclusivamente local e não faz parte do
Blueprint. Com `NODE_ENV=production`, o robô atende qualquer número que escrever
para o WhatsApp conectado. Use um número dedicado ao SDR antes de liberar o
serviço.

Após o primeiro deploy:

1. defina `WHATSAPP_HOOK_URL` no WAHA como
   `https://traco-sdr-api.onrender.com/webhooks/waha` (ou a URL real da API);
2. defina `VITE_SDR_API_URL` no frontend com a URL pública da API;
3. defina `FRONTEND_ORIGIN` na API com a origem HTTPS exata do frontend;
4. conecte o número dedicado pelo QR Code da tela do SDR;
5. valide `/health`, recebimento, resposta, Kommo e alerta crítico por e-mail.

Os valores necessários e a ordem de publicação estão detalhados em
`docs/sdr-render-homologation.md`.

## Quando ocorre intervenção humana

Nesta primeira versão:

- o lead pede atendente/pessoa;
- pergunta sobre pagamento, desconto, PIX, boleto, cartão, parcelamento ou negociação;
- conclui o formulário de matrícula, pois contrato e pagamento são tratados pelo humano;
- fala de reembolso, reclamação, cancelamento ou assunto sensível;
- a IA informa que não possui resposta ou confiança abaixo de 55%;
- OpenAI ou WAHA fica indisponível.

Ao ocorrer handoff, a conversa muda para `waiting_human` e `bot_enabled=false`.
Isso evita que o robô continue respondendo junto com o atendente.

## Integração Kommo

Quando `KOMMO_ENABLED=true`, o worker localiza o card pelo número do WhatsApp ou
cria um card no funil configurado:

- primeira mensagem: `Novo Lead`;
- graduação confirmada: `Qualificado`;
- interesse confirmado: `Interessado`;
- início da coleta: `Em Negociação`;
- coleta finalizada: `Dados Coletados`;
- fallback, pagamento ou handoff: `Aguardando Humano`.

Os 12 dados de matrícula são gravados nos campos `SDR - ...` do card. Falhas de
sincronização entram na fila Redis `sdr-kommo-retry`, com cinco tentativas e
backoff exponencial. O mapeamento de funil, colunas, responsável e prazo pode ser
administrado na etapa Kommo da interface; o token permanece somente no backend.

Os IDs do lead, contato e etapa ficam em `sdr_conversations`. Falhas do Kommo
são auditadas no banco, mas não interrompem a resposta do SDR no WhatsApp.
Credenciais e IDs pertencem ao backend e nunca devem usar prefixo `VITE_`.

Administradores também podem criar um funil padrão do SDR e renomear o funil ou
suas etapas pela interface. Essas ações alteram diretamente o Kommo, exigem um
token com permissão administrativa e são registradas em
`sdr_admin_audit_logs`. A interface não permite excluir funis ou etapas.

Antes de habilitar, aplique a migration
`20260813120000_add_sdr_kommo_sync.sql`. Para inspecionar o funil sem alterar o
Kommo, execute `npm run kommo:inspect`. O comando `kommo:test-lead` realiza uma
escrita real e exige a confirmação explícita de homologação.

## Segurança

- Nunca use `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca versione `.env.local`.
- O webhook sem HMAC válido recebe HTTP 401.
- Cada lead é identificado pelo `whatsapp_id` e possui conversa própria.
- Logs guardam conteúdo de conversa; defina política de retenção e acesso antes
  da produção, especialmente se usuários enviarem dados pessoais.

## Alertas críticos e retenção de dados

O Kommo trata os eventos comerciais. Uma conta Resend exclusiva do SDR envia
e-mail apenas em falhas técnicas críticas. Configure `RESEND_API_KEY`, `ALERT_EMAIL_FROM` e
`ALERT_EMAIL_TO` somente no backend. Os e-mails não incluem nome, telefone
completo nem conteúdo da conversa. A migration
`20260814130000_add_sdr_privacy_retention.sql` restringe os registros do SDR a
administradores e cria a rotina diária `sdr_apply_data_retention()`.

Depois do build, execute `npm run start:retention` diariamente em um cron job.
A política, os prazos e o procedimento operacional estão documentados em
`docs/sdr-privacy-retention.md`.
