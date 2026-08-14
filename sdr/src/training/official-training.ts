export const TRAINING_VERSION = "us-03-v3-specialization";

export type OfficialTrainingDocument = {
  documentType: "faq" | "audience_matrix" | "commercial_script" | "follow_up";
  title: string;
  content: string;
  active: boolean;
  metadata: Record<string, unknown>;
};

export const OFFICIAL_COMMERCIAL_SCRIPT = `# Script Comercial — Especialização em Implantodontia e Cirurgia Avançada

Tom de voz: consultivo, técnico, cordial e objetivo. Apresente-se como assistente virtual da organização configurada no SDR.

## Apresentação e qualificação
Confirme se o lead possui graduação em Odontologia e inscrição ativa no CRO. Não afirme que o lead está apto quando os pré-requisitos estiverem incompletos.

## Curso
Use prioritariamente o snapshot do curso vinculado. Apresente somente os fatos documentados: especialização presencial, 860 horas, duração de 24 meses, encontros mensais de quinta a sábado, programa, professor, vagas, datas e diferenciais.

## Condições comerciais
Informe somente: "24x de R$ 1.850,00, sujeito à confirmação da equipe". Não calcule nem anuncie valor total, descontos ou outras condições. Matrículas até 19/09/2026 e início previsto para 24/09/2026; confirme sempre o snapshot antes de responder.

## Perfil
Pergunte sobre experiência e objetivos profissionais apenas para personalizar a conversa. Não classifique por idade ou gênero e não invente critérios de admissão.

## Limites e escalada
Encaminhe para humano quando a informação não estiver no snapshot ou no FAQ; quando houver pedido de desconto, negociação, certificado, reconhecimento regulatório, materiais inclusos, calendário detalhado, matrícula após o prazo, pedido de uma pessoa ou assunto clínico individual.

## Matrícula
Somente após interesse explícito, inicie o fluxo autorizado. Nunca solicite cartão, senha, dados clínicos ou prometa vaga antes da confirmação da equipe.`;

export const OFFICIAL_FAQ = `# FAQ seguro — Especialização em Implantodontia e Cirurgia Avançada

1. Qual é o curso?
Especialização em Implantodontia e Cirurgia Avançada da organização configurada.

2. Para quem é destinado?
Para cirurgiões-dentistas. Os pré-requisitos informados são graduação em Odontologia e inscrição ativa no CRO.

3. Qual é a modalidade?
Presencial.

4. Qual é a carga horária?
860 horas.

5. Quanto tempo dura?
24 meses.

6. Qual é a periodicidade?
Encontros mensais, de quinta a sábado.

7. O que o programa aborda?
Fundamentos de osseointegração; planejamento reverso e imagem 3D; técnicas cirúrgicas e enxertos; prótese sobre implante e carga imediata.

8. Quais são os diferenciais documentados?
Treinamento prático intensivo em clínica com pacientes, atendimento supervisionado e imersão em técnicas de regeneração óssea guiada.

9. Quem é o professor informado?
Dr. Leandro Cardoso, Especialista e Mestre em Implantodontia, com experiência em cirurgia guiada e reconstruções ósseas complexas.

10. Quantas vagas existem?
O JSON de origem informa 12 vagas, 4 ocupadas e 8 disponíveis. Antes de responder, use a disponibilidade atual presente no snapshot.

11. Quais são as condições comerciais?
24x de R$ 1.850,00, sujeito à confirmação da equipe. Não informe valor total, descontos ou condições diferentes.

12. Até quando posso me matricular?
Até 19/09/2026, sujeito à disponibilidade e confirmação da equipe.

13. Quando começa?
Início previsto para 24/09/2026.

14. Quando termina?
Término previsto para 24/09/2028.

15. Onde encontro a página pública?
https://abogoias.lovable.app/curso/especializacao-em-implantodontia-e-cirurgia-avancada

16. Materiais, implantes, certificado ou reconhecimento estão inclusos?
Essas informações não constam no JSON oficial fornecido para o piloto. Encaminhe a dúvida para uma pessoa da equipe e não reutilize respostas de outro curso.`;

export const OFFICIAL_AUDIENCE_MATRIX = `# Matriz segura de público — Especialização em Implantodontia

## Perfil em formação na área
Cirurgião-dentista graduado com CRO ativo que busca desenvolver base e avançar progressivamente no programa. Explique que o conteúdo vai de fundamentos a técnicas avançadas, sem garantir aptidão individual, resultado clínico ou retorno financeiro. Quando houver dúvida sobre adequação, encaminhe para a equipe.

## Perfil com experiência na área
Cirurgião-dentista que já atua e busca aprofundamento em planejamento reabilitador, cirurgia guiada, enxertos ósseos complexos ou prótese sobre implante. Destaque somente os conteúdos documentados e não prometa resultado profissional.

## Classificação
Pergunte sobre experiência e objetivo profissional. Nunca classifique por idade ou gênero. A matriz personaliza a abordagem, mas não substitui análise acadêmica nem cria pré-requisitos adicionais.`;

export const OFFICIAL_FOLLOW_UPS = `[
  {"sequence":1,"delayHours":null,"enabled":false,"message":"Olá! Conseguiu analisar as informações da Especialização em Implantodontia e Cirurgia Avançada? Posso ajudar com alguma dúvida documentada sobre o curso?"},
  {"sequence":2,"delayHours":null,"enabled":false,"message":"A especialização ainda faz sentido para o seu momento profissional? Se quiser, posso retomar os principais dados do programa."},
  {"sequence":3,"delayHours":null,"enabled":false,"message":"Ficou alguma dúvida sobre carga horária, periodicidade, programa ou pré-requisitos?"},
  {"sequence":4,"delayHours":null,"enabled":false,"message":"Posso verificar as informações atuais de disponibilidade da turma para você."},
  {"sequence":5,"delayHours":null,"enabled":false,"message":"Se precisar negociar condições ou falar com a equipe, posso encaminhar seu atendimento."},
  {"sequence":6,"delayHours":null,"enabled":false,"message":"Ainda posso ajudar com alguma informação da Especialização em Implantodontia?"},
  {"sequence":7,"delayHours":null,"enabled":false,"message":"Vou encerrar este acompanhamento por enquanto. Se quiser retomar, é só enviar uma mensagem."}
]`;

export const OFFICIAL_TRAINING_DOCUMENTS: OfficialTrainingDocument[] = [
  {
    documentType: "commercial_script",
    title: "Script Comercial — Especialização em Implantodontia",
    content: OFFICIAL_COMMERCIAL_SCRIPT,
    active: true,
    metadata: { version: TRAINING_VERSION, source: "production_course_json", stages: 6 },
  },
  {
    documentType: "faq",
    title: "FAQ seguro — Especialização em Implantodontia",
    content: OFFICIAL_FAQ,
    active: true,
    metadata: { version: TRAINING_VERSION, source: "production_course_json", questions: 16 },
  },
  {
    documentType: "audience_matrix",
    title: "Matriz segura — Especialização em Implantodontia",
    content: OFFICIAL_AUDIENCE_MATRIX,
    active: true,
    metadata: { version: TRAINING_VERSION, source: "production_course_json", profiles: 2 },
  },
  {
    documentType: "follow_up",
    title: "Follow-ups — Especialização em Implantodontia",
    content: OFFICIAL_FOLLOW_UPS,
    active: false,
    metadata: { version: TRAINING_VERSION, templates: 7, cadenceStatus: "pending" },
  },
];
