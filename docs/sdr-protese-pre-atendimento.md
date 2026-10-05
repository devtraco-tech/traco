# Pré-atendimento de Prótese Dentária — 01/10/2026

Versão do treinamento: `protese-dentaria-v17-2026-10-01`. Fontes: roteiro de pré-atendimento, FAQ com 14 perguntas e matriz de públicos fornecidos pela equipe comercial.

A matriz distingue recém-formados e profissionais já atuantes, com dores, crenças, objeções, desejos e respostas recomendadas. Objetivos de renda e ticket médio são tratados como desejos possíveis, sem promessas de retorno financeiro. As referências demográficas são descritivas e não orientam a classificação do lead. A referência final a Implantodontia foi corrigida para Prótese Dentária, e a duração permanece em mais de 2 anos.

O fluxo segue: abertura com Julyane → graduação em Odontologia → perfil profissional (esclarecer respostas ambíguas) → apresentação da especialização → envio do projeto em PDF → confirmação de continuidade → conexão com a ABO → adequação ao momento de carreira → dúvidas pontuais → confirmação do formato → investimento → matrícula.

- Pedido antecipado de preço: pedir uma vez autorização para apresentar a proposta. Se o lead recusar ou insistir, informar 25 parcelas de R$ 2.500,00 e perguntar se deseja conhecer a proposta. O aceite retoma a qualificação ou apresentação, sem ser interpretado como confirmação de graduação.
- Não graduados: oferecer a imersão em Endodontia; após aceite apresentar datas, conteúdo, coordenação e materiais. O interesse na imersão vai ao humano para confirmar a turma e as condições. A ficha e os valores de Prótese não se aplicam à imersão.
- Formato: 856h em 25 módulos; quarta, quinta e sexta, 08h–12h e 14h–20h; sábado, 08h–12h. Aguardar confirmação antes do fechamento.
- Matrícula: coletar os 11 campos do roteiro, com passaporte opcional; depois solicitar os documentos e o comprovante quando houver pagamento. A equipe humana confere documentos e faz a baixa do pagamento.
- Lembretes: 4 horas após a primeira abordagem, no mesmo dia; 4 horas após informar o valor antecipadamente sem retorno. O worker verifica etapa, última resposta, curso vinculado e bot ativo antes do envio. Não são repetidos automaticamente.

## Aplicação no ambiente

Aplicar a migração `supabase/migrations/20261001120000_update_prosthodontics_flow.sql` antes de iniciar o worker atualizado. Instalar a nova base de treinamento para a sessão vinculada a Prótese e publicar o worker. No ambiente de desenvolvimento, o comando `npm run seed:training` dentro de `sdr` instala o pacote do curso vinculado; esse script aceita somente o projeto `abo-traco-dev`.

O material informa início da especialização em **03/03** e imersão de **1º a 3 de outubro**, sem ano. Não atribuir um ano automaticamente; a equipe comercial precisa confirmar a turma vigente.
