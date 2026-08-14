# SDR independente e conector de catálogo ABO Goiás

## Objetivo

O Robô SDR é um produto independente. WhatsApp, IA, memória, treinamento,
auditoria, retenção, alertas e CRM pertencem ao núcleo do SDR. A ABO Goiás é uma
organização cliente que instala um conector de catálogo de cursos.

Referências a domínio, marca, curso e textos da ABO não devem ficar codificadas
no núcleo. Elas entram por configuração, treinamento ou dados retornados pelo
conector.

## Arquitetura

```text
Painel administrativo do SDR
            |
        API do SDR
        /       \
  Núcleo SDR    Conector de catálogo
  WAHA          ABO Goiás
  OpenAI             |
  Redis         API somente leitura de cursos
  Kommo
  Banco SDR
```

O banco do SDR guarda conversas, configurações, snapshots dos itens selecionados
e auditoria. Ele não consulta tabelas privadas de pacientes da organização.

## Contrato genérico do catálogo

O núcleo deve conhecer uma interface genérica:

```ts
interface CatalogProvider {
  list(filters: CatalogFilters): Promise<CatalogResult>;
}
```

O item contém identificação, título, categoria, descrição, público, preço,
datas, disponibilidade, URL pública e metadados. Cada conector converte o formato
da organização para esse contrato.

## Instalação na ABO Goiás

1. A ABO disponibiliza um endpoint HTTPS somente leitura para cursos publicados.
2. A chave fornecida ao SDR possui apenas acesso público ao catálogo; nunca é
   usada `service_role` do banco da ABO.
3. No backend do SDR são configurados provedor, URL, caminho e chave do conector.
4. O painel do SDR chama sua própria rota `/api/sdr/catalog/items`.
5. A API do SDR consulta o conector ABO e devolve a lista normalizada.
6. O administrador escolhe um curso e o SDR grava um snapshot no banco próprio.
7. Durante a conversa, o robô responde com esse snapshot e pode sincronizá-lo
   novamente para atualizar vagas, datas e condições.
8. Leads, CPF, CRO, endereço, histórico e tokens permanecem no SDR/Kommo; não são
   gravados no catálogo de cursos.

O endpoint existente `/functions/v1/wordpress-courses` pode cumprir o primeiro
passo, desde que a equipe da ABO forneça a URL de produção e uma chave pública
restrita. O backend do SDR faz a chamada; o navegador não recebe essa chave.

## Configuração pretendida

```env
CATALOG_PROVIDER=abo-goias
CATALOG_PROVIDER_NAME=ABO Goiás
CATALOG_BASE_URL=https://projeto-da-organizacao.supabase.co
CATALOG_API_KEY=chave_publica_somente_leitura
CATALOG_COURSES_PATH=/functions/v1/wordpress-courses
CATALOG_CACHE_TTL_SECONDS=60
CATALOG_TIMEOUT_MS=10000
```

Ao instalar o mesmo SDR em outro cliente, muda-se o conector e a configuração;
o núcleo permanece igual.

## Frontend independente

O painel do SDR deve ser publicado como aplicação própria, por exemplo:

```text
https://sdr.seudominio.com
```

O sistema da ABO pode adicionar um menu que abre esse endereço, usar SSO no
futuro ou incorporar uma rota autorizada. O frontend do SDR não deve depender do
layout, domínio ou banco privado do portal da ABO.

## Estado da separação

O núcleo já usa `CatalogItem`, `CatalogProvider`, rotas `/api/sdr/catalog/*` e
variáveis `CATALOG_*`. O painel mostra um catálogo sem marca fixa, e a migration
`20260814150000_generalize_sdr_catalog.sql` preserva os snapshots existentes ao
renomear as colunas do banco.

A extração física do painel para uma aplicação web própria é uma etapa de
implantação. Até lá, a rota administrativa permanece disponível no monorepo do
portal, mas se comunica apenas com a API genérica do SDR.

## Dados que continuam específicos da ABO

O nome da instituição, texto comercial, documentos de treinamento, URL pública
do curso e formato da API continuam específicos da ABO, mas ficam no pacote do
conector/configuração da instalação. Eles não representam dependência do núcleo.
