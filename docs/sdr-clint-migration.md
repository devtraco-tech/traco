# Integração exclusiva com a Clint

O SDR comercial da ABO usa a Clint como único CRM. O escopo contempla somente
leads interessados em cursos; cadastros de pacientes não são enviados ao CRM.

## Configuração obrigatória

Configure no backend:

- `CLINT_API_TOKEN`;
- `CLINT_ORIGIN_ID`;
- IDs das etapas `CLINT_*_STAGE_ID`;
- `CLINT_RESPONSIBLE_USER_ID`;
- IDs dos campos comerciais `CLINT_FIELD_*_ID`;
- opcionalmente, `CLINT_HANDOFF_NOTE_FIELD_ID`.

Os identificadores são UUIDs da conta Clint. O comando
`npm run clint:inspect`, executado na pasta `sdr`, consulta origens, usuários e
campos sem criar ou alterar negócios.

## Fluxo

1. O SDR cria ou localiza um negócio aberto pelo telefone e pela origem.
2. Mudanças de qualificação avançam a etapa correspondente.
3. Os dados de matrícula são gravados nos campos configurados.
4. Um pedido de atendimento humano atribui o responsável e move o negócio para
   a etapa de handoff.
5. Falhas entram na fila `sdr-clint-retry`.

## Banco e publicação

Aplique, na ordem, as migrations de 8 de setembro de 2026 que adicionam os
vínculos da Clint, atualizam a retenção e removem as estruturas do CRM anterior.
Depois publique API, worker e função `wordpress-courses` com as mesmas
credenciais Clint.

Antes da liberação, valide a tela do SDR, a criação de um lead de curso, a
movimentação de etapas, a coleta de matrícula e o handoff.
