import {
  ENROLLMENT_FIELDS,
  type AudienceProfile,
  type ConversationContext,
  type EnrollmentData,
  type EnrollmentField,
  type FlowStage,
  type LeadQualification,
} from "./types.js";
import type { CatalogItemSnapshot } from "./catalog.js";
import type { SupportedLanguage } from "./language.js";

export type FlowPatch = {
  flowStage?: FlowStage;
  leadQualification?: LeadQualification;
  audienceProfile?: AudienceProfile;
  interestConfirmed?: boolean;
  enrollmentStep?: number;
  enrollmentNotificationSent?: boolean;
};

export type CommercialFlowDecision = {
  handled: boolean;
  messages: string[];
  patch?: FlowPatch;
  enrollmentData?: EnrollmentData;
  notifyEnrollment?: boolean;
  handoffAfterFlow?: {
    reason: "commercial_high_intent";
    details: string;
  };
};

const COPY = {
  pt: {
    presentation: "Oii! Tudo bem com você? 👋\nSou a Karol, do time da ABO Goiás. ✨\n\nSerei sua consultora acadêmica e a seguir vou te apresentar o curso e tirar todas as dúvidas que surgirem.\n\nMas antes me conta, você já é graduado em odontologia?",
    notGraduated: "Entendi, Dr.! Para participar de nossas turmas, é necessário ter graduação em Odontologia. Assim que concluir a faculdade, será um prazer recebê-lo em um de nossos cursos.",
    finalMessage: "Muito obrigada pelos dados, Dr.! Agora vamos gerar o seu contrato e o link de pagamento. Assim que estiverem prontos, encaminharei tudo para você dar continuidade à sua matrícula.",
    enrollmentIntro: "Dr., parabéns pela sua decisão! Estamos muito felizes em tê-lo conosco.\n\nAgora preciso apenas de alguns dados para dar sequência ao próximo passo e iniciar a sua matrícula. Responda em uma única mensagem usando somente o número e o valor, sem precisar repetir o nome do campo:",
    incomplete: "Não consegui validar todos os dados:",
    resend: "Por favor, corrija e reenvie a lista completa em uma única mensagem. Você pode usar somente o número e o valor, seguindo a numeração apresentada; se preferir escrever o nome dos campos, poderá enviá-los em qualquer ordem.",
    noInterest: "Tudo bem! Se surgir alguma dúvida sobre o curso, estou à disposição para ajudar.",
  },
  en: {
    presentation: "Hello! How are you? I’m the virtual assistant for the team responsible for the course. I’ll introduce the course and answer your questions. First, are you already a graduate in Dentistry?",
    notGraduated: "I understand. A degree in Dentistry is required to join this class. Once you graduate, we’ll be happy to welcome you to one of our courses.",
    finalMessage: "Thank you very much for the information, Doctor! We will now prepare your contract and payment link. As soon as they are ready, I will send everything to you so you can continue your enrollment.",
    enrollmentIntro: "Congratulations on your decision! To begin your enrollment, reply in a single message using only each number and its value. You do not need to repeat the field names:",
    incomplete: "I could not validate all the information:",
    resend: "Please correct the information and resend the complete list in a single message. You may use only the number and value in the order shown; if you include the field names, you may send them in any order.",
    noInterest: "No problem! If you have any questions about the course, I’m here to help.",
  },
  es: {
    presentation: "¡Hola! ¿Todo bien? 👋\nSoy Karol, del equipo de ABO Goiás. ✨\n\nSeré tu consultora académica y, a continuación, te presentaré el curso y aclararé todas las dudas que surjan.\n\nPero antes cuéntame: ¿ya te graduaste en Odontología?",
    notGraduated: "Entiendo, Dr. Para participar en nuestros grupos, es necesario haberse graduado en Odontología. Cuando termines la carrera, será un placer recibirte en uno de nuestros cursos.",
    finalMessage: "¡Muchas gracias por los datos, Dr.! Ahora prepararemos tu contrato y el enlace de pago. En cuanto estén listos, te enviaré todo para que puedas continuar con tu inscripción.",
    enrollmentIntro: "¡Felicitaciones por tu decisión! Para iniciar tu inscripción, responde en un único mensaje usando solamente cada número y su valor. No necesitas repetir los nombres de los campos:",
    incomplete: "No pude validar todos los datos:",
    resend: "Por favor, corrige la información y vuelve a enviar la lista completa en un único mensaje. Puedes usar solo el número y el valor en el orden indicado; si incluyes los nombres de los campos, puedes enviarlos en cualquier orden.",
    noInterest: "¡Está bien! Si tienes alguna duda sobre el curso, estoy aquí para ayudarte.",
  },
} satisfies Record<SupportedLanguage, Record<string, string>>;

const FIELD_LABELS: Record<SupportedLanguage, Record<EnrollmentField, string>> = {
  pt: {
  full_name: "Nome completo",
  whatsapp_phone: "Número WhatsApp",
  cpf: "CPF",
  birth_date: "Data de nascimento",
  marital_status: "Estado civil",
  nationality: "Nacionalidade",
  birthplace: "Naturalidade",
  cro: "CRO",
  email: "E-mail",
  address: "Endereço",
  district: "Bairro",
  postal_code: "CEP",
  },
  en: {
    full_name: "Full name",
    whatsapp_phone: "WhatsApp number with area/country code",
    cpf: "CPF",
    birth_date: "Date of birth (DD/MM/YYYY)",
    marital_status: "Marital status",
    nationality: "Nationality",
    birthplace: "Place of birth (city and state)",
    cro: "CRO registration and state",
    email: "Email",
    address: "Full address, number, and additional details",
    district: "Neighborhood",
    postal_code: "Postal code (CEP)",
  },
  es: {
    full_name: "Nombre completo",
    whatsapp_phone: "WhatsApp con código de área/país",
    cpf: "CPF",
    birth_date: "Fecha de nacimiento (DD/MM/AAAA)",
    marital_status: "Estado civil",
    nationality: "Nacionalidad",
    birthplace: "Lugar de nacimiento (ciudad y estado)",
    cro: "CRO con estado",
    email: "Correo electrónico",
    address: "Dirección completa, número y complemento",
    district: "Barrio",
    postal_code: "Código postal (CEP)",
  },
};

const FIELD_ALIASES: Record<EnrollmentField, string[]> = {
  full_name: ["nome", "nome completo", "name", "full name", "nombre", "nombre completo"],
  whatsapp_phone: ["whatsapp", "telefone", "celular", "whatsapp com ddd", "numero whatsapp", "phone", "phone number", "whatsapp number", "telefono", "numero de telefono"],
  cpf: ["cpf"],
  birth_date: ["data de nascimento", "nascimento", "data nascimento", "date of birth", "birth date", "fecha de nacimiento"],
  marital_status: ["estado civil", "marital status"],
  nationality: ["nacionalidade", "nationality", "nacionalidad"],
  birthplace: ["naturalidade", "cidade natal", "local de nascimento", "place of birth", "birthplace", "lugar de nacimiento"],
  cro: ["cro", "numero do cro", "registro cro", "cro registration"],
  email: ["email", "e-mail", "correo", "correo electronico"],
  address: ["endereco", "endereco completo", "address", "full address", "direccion", "direccion completa"],
  district: ["bairro", "neighborhood", "barrio"],
  postal_code: ["cep", "codigo postal", "postal code", "zip code"],
};

// Ordem exibida ao lead. CPF e data continuam sendo armazenados nos mesmos campos;
// apenas a posição de preenchimento segue o modelo solicitado pelo atendimento.
const ENROLLMENT_POSITIONAL_FIELDS: readonly EnrollmentField[] = [
  "full_name",
  "whatsapp_phone",
  "birth_date",
  "cpf",
  "marital_status",
  "nationality",
  "birthplace",
  "cro",
  "email",
  "address",
  "district",
  "postal_code",
];

function enrollmentForm(language: SupportedLanguage): string {
  return [
    COPY[language].enrollmentIntro,
    "",
    ...ENROLLMENT_POSITIONAL_FIELDS.map(
      (field, index) => `${index + 1}. ${FIELD_LABELS[language][field]}:`,
    ),
  ].join("\n");
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatCurrency(
  value: number | null,
  currency: string | null,
  language: SupportedLanguage,
): string | null {
  if (value === null) return null;
  const rawCurrency = currency?.trim() || "BRL";
  const aliases: Record<string, string> = {
    real: "BRL",
    reais: "BRL",
    "r$": "BRL",
    brl: "BRL",
  };
  const currencyCode = aliases[rawCurrency.toLocaleLowerCase("pt-BR")]
    ?? rawCurrency.toUpperCase();

  try {
    const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(value);
  } catch {
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `${formattedValue} ${rawCurrency}`;
  }
}

function coursePresentation(
  course: CatalogItemSnapshot | undefined,
  language: SupportedLanguage,
): string[] {
  if (!course) {
    if (language === "en") return [
      "I will only present confirmed information about the selected course.",
      "Now I’d like to understand your professional background. Do you already work in this field, or would this be your first training in it?",
    ];
    if (language === "es") return [
      "Presentaré únicamente la información confirmada del curso seleccionado.",
      "Ahora quisiera entender tu experiencia profesional. ¿Ya trabajas en esta área o sería tu primera formación en ella?",
    ];
    return ["Vou apresentar somente as informações confirmadas do curso selecionado.", "Agora quero entender seu momento profissional para te orientar melhor. Você já atua nessa área ou busca sua primeira formação nela?"];
  }
  const investment = formatCurrency(course.investment, course.currency, language);
  const locale = language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR";
  const formatDate = (value: string | null) => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString(locale)
    : null;
  if (language === "en") {
    const details = [
      course.workload !== null ? `${course.workload} hours` : null,
      investment ? `listed investment: ${investment}` : null,
      course.registration_deadline ? `enrollment deadline: ${formatDate(course.registration_deadline)}` : null,
      course.effective_start_date ? `expected start: ${formatDate(course.effective_start_date)}` : null,
      course.available_vacancies !== null ? `${course.available_vacancies} place(s) currently available` : null,
    ].filter(Boolean);
    return [
      `The selected course is ${course.title}. I will use only the confirmed information in its official catalog.`,
      details.length ? `Current catalog information: ${details.join(", ")}.` : "Other conditions must be confirmed with the responsible team.",
      `To better understand your background: do you already work in ${course.area ?? "this field"}, or would this be your first training in it?`,
    ];
  }
  if (language === "es") {
    return [
      "Este *Curso de Perfeccionamiento en Implantología* en el que demostraste interés es *referente en el mercado desde hace más de 20 años*. Su objetivo es que *en 10 meses seas capaz de planificar y colocar implantes con seguridad*, desde casos unitarios hasta prótesis sobre implantes. Cuenta con los siguientes diferenciales:\n\n💎 Implantes, kit quirúrgico y motor de implantes incluidos (excepto contraángulo)\n💎 Protocolos simplificados, guía quirúrgica y flujo digital\n💎 Práctica de laboratorio y clínica supervisada\n💎 Amplia disponibilidad de pacientes para la práctica\n💎 Coordinación: Dr. Getúlio Souza de Marães, doctor en Implantología\n💎 Equipo de profesores especialistas, másteres y doctores",
      "Estas son las principales informaciones sobre el curso 👇\n\n📅 Inicio: 18/09\n⏳ Duración: 10 meses | 140 h\n📚 Encuentros: generalmente un viernes y un sábado por mes\n💰 Inversión: 10 cuotas de R$ 1.700\n\nLos materiales están incluidos (implantes, kit quirúrgico y motor de implantes); solo es necesario adquirir el contraángulo para implantes.",
      "Bien... ahora quiero entender tu momento para poder orientarte: ¿ya realizas casos de Implantología o este será tu primer paso en el área?",
    ];
  }
  return [
    "Esse *Curso de Aperfeiçoamento em Implantodontia* que você demonstrou interesse é *referência no mercado há mais de 20 anos* e o objetivo dele é que *em 10 meses você seja capaz de planejar e operar implantes com segurança*, desde casos unitários até próteses sobre implante, e conta com diferenciais como:\n\n💎 Implantes, kit cirúrgico e motor de implante inclusos (exceto contra-ângulo)\n💎 Protocolos simplificados, guia cirúrgica e fluxo digital\n💎 Prática laboratorial e clínica supervisionada\n💎 Ampla disponibilidade de pacientes para prática\n💎 Coordenação: Dr. Getúlio Souza de Marães, doutor em Implantodontia\n💎 Equipe de professores especialistas, mestres e doutores",
    "Estas são as principais informações sobre esse curso 👇\n\n📅 Início: 18/09\n⏳ Duração: 10 meses | 140h\n📚 Encontros: geralmente uma sexta e um sábado por mês\n💰 Investimento: 10x de R$ 1.700\n\nLembrando que os materiais estão inclusos (implantes, kit cirúrgico e motor de implante), sendo necessário adquirir apenas o contra-ângulo para implantes.",
    "Bom... agora deixa eu entender seu momento pra te ajudar, você já faz casos de Implantodontia ou esse será seu primeiro passo na área?",
  ];
}

function profileMatch(
  profile: AudienceProfile,
  course: CatalogItemSnapshot | undefined,
  language: SupportedLanguage,
): string {
  const title = course?.title ?? "essa formação";
  if (language === "en") {
    return profile === "beginner"
      ? `I understand. The ${title} program starts with the fundamentals and progresses through the course content. Since suitability depends on your experience and the prerequisites, the team can confirm whether this class is right for you. Does that make sense for you?`
      : `Excellent. ${title} can help you deepen your planning and techniques in the field, according to the official program. Does it fit your current professional goals?`;
  }
  if (language === "es") {
    return profile === "beginner"
      ? "¡Perfecto! Este curso fue desarrollado precisamente para quienes desean comenzar en Implantología con seguridad, acompañamiento cercano de los profesores y mucha práctica clínica, además de actualizarse en protocolos simplificados, guía quirúrgica y flujo digital.\n\n¿Tiene sentido para ti?"
      : "¡Excelente! En tu caso, el curso funcionará como una actualización para dominar protocolos simplificados, guía quirúrgica y flujo digital, además de planificación y práctica con pacientes reales.\n\n¿Tiene sentido para ti?";
  }
  if (profile === "beginner") {
    return "Perfeito! Esse curso foi desenvolvido justamente para quem deseja começar na Implantodontia com segurança, acompanhamento próximo dos professores e bastante prática clínica, e já sair atualizado com os protocolos simplificados, guia cirúrgica e fluxo digital.\n\nFaz sentido pra você?";
  }
  return "Excelente! Então, nesse caso, o curso vai funcionar como uma atualização, pra dominar os protocolos simplificados, guia cirúrgica e o fluxo digital, além do planejamento e prática em paciente real.\n\nFaz sentido pra você?";
}

function qualificationFrom(text: string): LeadQualification {
  const value = normalize(text);
  if (
    /\b(nao sou|nao|ainda nao|estudante|academico|academica|cursando|not yet|not graduated|student|studying|no soy|todavia no|aun no|estudiante|cursando)\b/u.test(value)
  ) {
    return "not_graduated";
  }
  if (/\b(sim|sou dentista|dentista|formado|formada|graduado|graduada|yes|i am a dentist|dentist|graduated|si|soy dentista|odontologo|odontologa)\b/u.test(value)) {
    return "graduated";
  }
  return "unknown";
}

function profileFrom(text: string): AudienceProfile {
  const value = normalize(text);
  if (
    /\b(nunca|primeiro passo|primeira formacao|primeira especializacao|comecando|comecar na area|iniciante|ainda nao faco|recem[- ]formado|recem[- ]formada|formei agora|pouca experiencia|nao faco implante|nao realizo implante|never|first training|first course|beginner|starting|do not work in|recently graduated|little experience|primera formacion|primer curso|primer paso|principiante|empezando|aun no trabajo|no hago implantes|no realizo implantes|recien[- ]graduado|recien[- ]graduada)\b/u.test(
      value,
    )
  ) {
    return "beginner";
  }
  if (
    /\b(ja faco|ja realizo|atuo|experiencia|trabalho com|implantodontista|aprofundar|aperfeicoar|ja atendo|encaminho pacientes|already work|i work|experience|experienced|improve|deepen|refer patients|ya trabajo|trabajo con|ya hago|ya realizo|ejerzo|atiendo|experiencia|perfeccionar|profundizar)\b/u.test(
      value,
    )
  ) {
    return "experienced";
  }
  return "unknown";
}

function audienceObjectionResponse(
  text: string,
  language: SupportedLanguage,
): string | null {
  if (language === "en") return null;
  const value = normalize(text);

  if (/\b(especializacao|titulo de especialista|especializacion|titulo de especialista)\b/u.test(value)) {
    return language === "es"
      ? "El perfeccionamiento y la especialización tienen propuestas diferentes. Este curso ofrece desarrollo práctico y puede construir una base para tu actuación y para una futura especialización. La mejor elección depende de tu objetivo profesional; una opción no siempre es mejor que la otra."
      : "O aperfeiçoamento e a especialização têm propostas diferentes. Este curso oferece desenvolvimento prático e pode construir uma base para sua atuação e para uma futura especialização. A melhor escolha depende do seu objetivo profissional; uma opção não é sempre melhor que a outra.";
  }

  if (
    /\b(custo-beneficio|momento financeiro|sem recursos|nao tenho recursos|nao tenho dinheiro|esta caro|muito caro|valor alto|costo-beneficio|momento economico|momento financiero|sin recursos|no tengo dinero|es caro|muy caro|precio alto)\b/u.test(value)
  ) {
    return language === "es"
      ? "Entiendo tu preocupación. Solo puedo presentar las condiciones comerciales documentadas del curso, sin prometer un plazo de retorno ni un aumento de ingresos. Si deseas evaluar descuentos, negociación o condiciones diferentes, derivaré tu atención a una persona del equipo."
      : "Entendo sua preocupação. Posso apresentar somente as condições comerciais documentadas do curso, sem prometer prazo de retorno ou aumento de renda. Se você quiser avaliar descontos, negociação ou condições diferentes, encaminho seu atendimento para uma pessoa do time.";
  }

  if (
    /\b(mesmo conhecimento|mesmo conteudo|ja conheco|conteudo repetido|nao vale a pena pagar|mismo conocimiento|mismo contenido|ya conozco|contenido repetido|no vale la pena pagar)\b/u.test(value)
  ) {
    return language === "es"
      ? "Entre los diferenciales documentados están los protocolos simplificados, la guía quirúrgica, el flujo digital, la planificación y la práctica supervisada con pacientes reales. ¿Cuál de estos puntos sería más relevante para tu rutina?"
      : "Entre os diferenciais documentados estão protocolos simplificados, guia cirúrgica, fluxo digital, planejamento e prática supervisionada em paciente real. Qual desses pontos seria mais relevante para a sua rotina?";
  }

  if (
    /\b(avancado demais|distante do meu nivel|nao tenho experiencia|tenho medo|inseguro|insegura|demasiado avanzado|lejos de mi nivel|no tengo experiencia|tengo miedo)\b/u.test(value)
  ) {
    return language === "es"
      ? "La propuesta contempla a quienes están comenzando, con acompañamiento cercano, progresión del aprendizaje y práctica supervisada. La adecuación individual debe considerar tu formación y tu momento profesional, sin garantizar resultados clínicos."
      : "A proposta contempla quem está começando, com acompanhamento próximo, progressão do aprendizado e prática supervisionada. A adequação individual deve considerar sua formação e seu momento profissional, sem garantia de resultado clínico.";
  }

  return null;
}

function requestsEnrollment(text: string): boolean {
  const value = normalize(text);
  return (
    /\bquero me matricular\b/u.test(value)
    || /\b(i want to enroll|i want to register|start (my )?enrollment|begin (my )?enrollment)\b/u.test(value)
    || /\b(quiero inscribirme|quiero matricularme|iniciar (mi )?(inscripcion|matricula)|comenzar (mi )?(inscripcion|matricula))\b/u.test(value)
    || /\b(quero|desejo|vamos)\b.{0,35}\b(iniciar|comecar|fazer|realizar|seguir com)\b.{0,25}\bmatricula\b/u.test(
      value,
    )
  );
}

function enrollmentDecision(language: SupportedLanguage): CommercialFlowDecision {
  return {
    handled: true,
    messages: [enrollmentForm(language)],
    patch: {
      flowStage: "enrollment",
      interestConfirmed: true,
      enrollmentStep: 0,
      enrollmentNotificationSent: true,
    },
    notifyEnrollment: true,
  };
}

function confirmsInterest(text: string): boolean | null {
  const value = normalize(text);
  if (/\b(nao|agora nao|nao tenho interesse|nao faz sentido|no thanks|not interested|does not make sense|doesn't make sense|no me interesa|no tiene sentido|ahora no)\b/u.test(value)) return false;
  if (
    requestsEnrollment(value)
    || /\b(sim|faz sentido|tenho interesse|quero continuar|quero seguir|vamos|pode ser|com certeza|yes|makes sense|interested|continue|let's do it|sure|si|tiene sentido|me interesa|continuar|vamos|claro)\b/u.test(
      value,
    )
  ) {
    return true;
  }
  return null;
}

function validateEnrollmentValue(
  field: EnrollmentField,
  rawValue: string,
  language: SupportedLanguage,
): { valid: boolean; value: string; error?: string } {
  const value = rawValue.trim();
  const errors = language === "en"
    ? { incomplete: "This information seems incomplete.", cpf: "CPF must contain 11 digits.", email: "This email address does not appear to be valid.", date: "Use the DD/MM/YYYY format.", postal: "The Brazilian postal code (CEP) must contain 8 digits.", phone: "Enter a WhatsApp number with area/country code." }
    : language === "es"
      ? { incomplete: "Este dato parece incompleto.", cpf: "El CPF debe contener 11 números.", email: "Este correo electrónico no parece válido.", date: "Usa el formato DD/MM/AAAA.", postal: "El código postal brasileño (CEP) debe contener 8 números.", phone: "Indica un WhatsApp con código de área/país." }
      : { incomplete: "Esse dado parece incompleto.", cpf: "O CPF precisa ter 11 números.", email: "Esse e-mail não parece válido.", date: "Informe a data no formato DD/MM/AAAA.", postal: "O CEP precisa ter 8 números.", phone: "Informe um WhatsApp com DDD." };
  if (value.length < 2) return { valid: false, value, error: errors.incomplete };

  if (field === "cpf") {
    const digits = value.replace(/\D/gu, "");
    return digits.length === 11
      ? { valid: true, value: digits }
      : { valid: false, value, error: errors.cpf };
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    return { valid: false, value, error: errors.email };
  }
  if (field === "birth_date" && !/^\d{2}\/\d{2}\/\d{4}$/u.test(value)) {
    return { valid: false, value, error: errors.date };
  }
  if (field === "postal_code") {
    const digits = value.replace(/\D/gu, "");
    return digits.length === 8
      ? { valid: true, value: digits }
      : { valid: false, value, error: errors.postal };
  }
  if (field === "whatsapp_phone") {
    const digits = value.replace(/\D/gu, "");
    return digits.length >= 10 && digits.length <= 13
      ? { valid: true, value: digits }
      : { valid: false, value, error: errors.phone };
  }
  return { valid: true, value };
}

function fieldFromLabel(label: string): EnrollmentField | null {
  const normalizedLabel = normalize(label)
    .replace(/\([^)]*\)/gu, "")
    .replace(/[^a-z0-9\s-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

  for (const field of ENROLLMENT_FIELDS) {
    if (FIELD_ALIASES[field].some((alias) => normalizedLabel === normalize(alias))) {
      return field;
    }
  }
  return null;
}

function parseInlineNumberedValues(text: string): Map<number, string> {
  const markerPattern = /(?<!\S)(\d{1,2})(?:[.)-]\s*|\s+)/gu;
  const markers: Array<{ itemNumber: number; start: number; valueStart: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = markerPattern.exec(text)) !== null) {
    markers.push({
      itemNumber: Number(match[1]),
      start: match.index,
      valueStart: markerPattern.lastIndex,
    });
  }

  const sequence: typeof markers = [];
  let searchFrom = 0;
  for (let expected = 1; expected <= ENROLLMENT_FIELDS.length; expected += 1) {
    const markerIndex = markers.findIndex(
      (marker, index) => index >= searchFrom && marker.itemNumber === expected,
    );
    if (markerIndex < 0) return new Map();
    sequence.push(markers[markerIndex]!);
    searchFrom = markerIndex + 1;
  }

  const values = new Map<number, string>();
  sequence.forEach((marker, index) => {
    const next = sequence[index + 1];
    const value = text.slice(marker.valueStart, next?.start ?? text.length).trim();
    if (value) values.set(marker.itemNumber, value);
  });
  return values;
}

function parseEnrollmentForm(text: string): EnrollmentData {
  const lines = text
    .split(/\r?\n|\s*;\s*/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: EnrollmentData = {};
  const positionalValues: string[] = [];
  const numberedValues = new Map<number, string>();

  for (const line of lines) {
    const numberedMatch = line.match(/^(\d{1,2})(?:\s*[.)-]\s*|\s+)(.+)$/u);
    const numbered = numberedMatch?.[2]?.trim()
      ?? line.replace(/^[-*]\s+/u, "").trim();
    const labeledValue = numbered.match(/^(.+?)(?:\s*[:=]\s*|\s+-\s+)(.+)$/u);
    if (labeledValue?.[1] && labeledValue[2]) {
      const field = fieldFromLabel(labeledValue[1]);
      if (field) {
        result[field] = labeledValue[2].trim();
        continue;
      }
    }
    const itemNumber = Number(numberedMatch?.[1]);
    if (Number.isInteger(itemNumber) && itemNumber >= 1 && itemNumber <= ENROLLMENT_FIELDS.length) {
      numberedValues.set(itemNumber, numbered);
    } else {
      positionalValues.push(numbered);
    }
  }

  if (numberedValues.size < ENROLLMENT_FIELDS.length) {
    const inlineValues = parseInlineNumberedValues(text);
    if (inlineValues.size === ENROLLMENT_FIELDS.length) {
      inlineValues.forEach((value, itemNumber) => numberedValues.set(itemNumber, value));
    }
  }

  if (numberedValues.size > 0) {
    const thirdValue = numberedValues.get(3) ?? "";
    // Compatibilidade com o formato antigo, no qual CPF era o item 3 e data o 4.
    const thirdLooksLikeDate = /^\d{2}\/\d{2}\/\d{4}$/u.test(thirdValue);
    const positionalFields = thirdLooksLikeDate
      ? ENROLLMENT_POSITIONAL_FIELDS
      : ENROLLMENT_FIELDS;
    positionalFields.forEach((field, index) => {
      const value = numberedValues.get(index + 1);
      if (value && !result[field]) result[field] = value;
    });
  } else if (Object.keys(result).length === 0 && positionalValues.length === ENROLLMENT_FIELDS.length) {
    const thirdLooksLikeDate = /^\d{2}\/\d{2}\/\d{4}$/u.test(positionalValues[2] ?? "");
    const positionalFields = thirdLooksLikeDate
      ? ENROLLMENT_POSITIONAL_FIELDS
      : ENROLLMENT_FIELDS;
    positionalFields.forEach((field, index) => {
      result[field] = positionalValues[index] ?? "";
    });
  }

  return result;
}

function validateEnrollmentForm(text: string, language: SupportedLanguage): {
  data: EnrollmentData;
  errors: string[];
} {
  const parsed = parseEnrollmentForm(text);
  const data: EnrollmentData = {};
  const errors: string[] = [];

  for (const field of ENROLLMENT_FIELDS) {
    const rawValue = parsed[field]?.trim();
    if (!rawValue) {
      const missing = language === "en" ? "not provided" : language === "es" ? "no informado" : "não informado";
      errors.push(`${FIELD_LABELS[language][field]}: ${missing}.`);
      continue;
    }
    const validation = validateEnrollmentValue(field, rawValue, language);
    if (!validation.valid) {
      const invalid = language === "en" ? "invalid value" : language === "es" ? "valor inválido" : "valor inválido";
      errors.push(`${FIELD_LABELS[language][field]}: ${validation.error ?? invalid}`);
      continue;
    }
    data[field] = validation.value;
  }

  return { data, errors };
}

export function decideCommercialFlow(
  context: ConversationContext,
  currentText: string,
  course?: CatalogItemSnapshot,
  language: SupportedLanguage = "pt",
): CommercialFlowDecision {
  if (context.flowStage === "presentation") {
    return {
      handled: true,
      messages: [COPY[language].presentation],
      patch: { flowStage: "qualification" },
    };
  }

  if (context.flowStage === "qualification") {
    const qualification = qualificationFrom(currentText);
    if (qualification === "unknown") return { handled: false, messages: [] };
    if (qualification === "not_graduated") {
      return {
        handled: true,
        messages: [COPY[language].notGraduated],
        patch: { flowStage: "disqualified", leadQualification: qualification },
      };
    }
    return {
      handled: true,
      messages: coursePresentation(course, language),
      patch: { flowStage: "profile", leadQualification: qualification },
    };
  }

  if (context.flowStage === "profile") {
    if (
      context.leadQualification === "graduated"
      && requestsEnrollment(currentText)
    ) {
      return enrollmentDecision(language);
    }
    const profile = profileFrom(currentText);
    if (profile === "unknown") return { handled: false, messages: [] };
    const objectionResponse = audienceObjectionResponse(currentText, language);
    return {
      handled: true,
      messages: [
        ...(objectionResponse ? [objectionResponse] : []),
        profileMatch(profile, course, language),
      ],
      patch: { flowStage: "match", audienceProfile: profile },
    };
  }

  if (context.flowStage === "match") {
    const objectionResponse = audienceObjectionResponse(currentText, language);
    if (objectionResponse) {
      return { handled: true, messages: [objectionResponse] };
    }
    const interest = confirmsInterest(currentText);
    if (interest === null) return { handled: false, messages: [] };
    if (!interest) {
      return {
        handled: true,
        messages: [
          COPY[language].noInterest,
        ],
        patch: { interestConfirmed: false },
      };
    }
    const decision = enrollmentDecision(language);
    decision.notifyEnrollment = !context.enrollmentNotificationSent;
    return decision;
  }

  if (context.flowStage === "enrollment") {
    const validation = validateEnrollmentForm(currentText, language);
    const handoffDetails = validation.errors.length > 0
      ? `Dados de matrícula recebidos com pendências para conferência humana: ${validation.errors.join(" | ")}`
      : "Dados de matrícula concluídos; contrato e pagamento exigem atendimento humano.";
    return {
      handled: true,
      messages: [COPY[language].finalMessage],
      patch: {
        flowStage: "completed",
        enrollmentStep: ENROLLMENT_FIELDS.length,
      },
      enrollmentData: validation.data,
      handoffAfterFlow: {
        reason: "commercial_high_intent",
        details: handoffDetails,
      },
    };
  }

  return { handled: false, messages: [] };
}
