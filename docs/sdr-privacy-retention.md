# SDR: alertas críticos, acesso e retenção

## Kommo + e-mail crítico

O Kommo continua sendo o canal operacional para o atendimento humano: atribui o
responsável, cria a tarefa e guarda os dados necessários para o vendedor. O
e-mail é um canal independente reservado a falhas técnicas críticas, inclusive
quando o Kommo não puder ser acessado.

O SDR usa uma conta/projeto Resend exclusivo. A API key e o domínio de envio não
são compartilhados com outros módulos do sistema. O remetente precisa pertencer
a um domínio verificado nessa conta exclusiva.

Variáveis do backend:

```env
RESEND_API_KEY=re_...
ALERT_EMAIL_FROM=Robô SDR Traço <alertas@seudominio.com.br>
ALERT_EMAIL_TO=suporte@seudominio.com.br
```

A chave do Resend é segredo e não pode ser colocada no frontend, no Git ou em
capturas de tela. Os e-mails contêm apenas tipo, severidade e UUID da
conversa. Nome, telefone completo, conteúdo da mensagem, CPF, CRO, nascimento e
endereço devem ser consultados no Kommo por usuário autorizado.

Eventos cobertos:

- falha final do processamento após os retries;
- falha persistente de sincronização com o Kommo;
- erro interno inesperado da API;
- indisponibilidade da IA ou WAHA que resulte em handoff;

Novo lead, avanço do funil, matrícula e solicitação de humano ficam no Kommo e
não geram e-mail. Assim, a caixa de suporte recebe somente incidentes técnicos.

Depois de preencher as variáveis em `.env.local`, valide uma única entrega com:

```bash
npm run alerts:test-email -- --confirm-email-delivery
```

## Acesso

- `service_role`: API, worker e rotina de retenção; somente no backend.
- `admin`: configuração e consulta das tabelas do SDR.
- demais usuários autenticados: sem acesso direto às conversas, mensagens,
  eventos, notificações ou fichas de matrícula no Supabase.
- vendedores: acesso aos dados necessários pelo Kommo e conforme as permissões
  configuradas naquele sistema.

As políticas RLS da migration `20260814130000_add_sdr_privacy_retention.sql`
aplicam esse limite. A chave `service_role` nunca pode usar prefixo `VITE_`.

## Retenção técnica padrão

| Categoria | Prazo | Ação |
| --- | ---: | --- |
| Payload bruto do WAHA | 7 dias | Substituir por objeto vazio |
| Formulário e mensagens com dados pessoais | 30 dias | Excluir ficha e redigir mensagem, após sincronização com Kommo |
| Detalhes de handoff resolvido | 30 dias | Redigir texto livre |
| Auditoria de notificações | 90 dias | Excluir |
| Eventos operacionais | 180 dias | Excluir |
| Conversas resolvidas/encerradas | 180 dias | Excluir em cascata |
| Lead sem conversa | 180 dias sem atividade | Excluir |

Os valores ficam em `sdr_data_retention_config`. Alterações precisam de decisão
documentada do controlador/encarregado de dados. A rotina não exclui uma ficha
de matrícula enquanto a sincronização com o Kommo não estiver marcada como
`synced`.

## Execução

Após aplicar a migration, execute diariamente no serviço de cron:

```bash
npm run start:retention
```

Em desenvolvimento, depois do build, o mesmo comando retorna apenas contadores
das linhas tratadas; ele não imprime conteúdo pessoal. Configure o agendamento
para uma vez ao dia e gere alerta se o processo retornar código diferente de
zero.

## Aprovação antes da produção

Esta é uma política técnica de minimização, não uma conclusão jurídica. Antes
da produção, a ABO deve registrar finalidade, base legal, responsáveis,
procedimento para solicitações dos titulares e os prazos finais aprovados pelo
encarregado ou consultoria jurídica.
