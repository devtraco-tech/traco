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

const PRESENTATION =
  "Olá! Tudo bem? Sou a assistente virtual da equipe responsável. Vou apresentar o curso e tirar suas dúvidas. Mas antes me conta: você já é graduado em Odontologia?";

const NOT_GRADUATED =
  "Entendi! Para participar dessa turma, é necessário ter graduação em Odontologia. Assim que concluir a faculdade, será um prazer receber você em um de nossos cursos.";

const FINAL_MESSAGE =
  "Muito obrigada! Seus dados foram recebidos. Agora vou encaminhar você para uma pessoa do nosso time, que continuará o atendimento com as orientações sobre contrato e pagamento.";

const FIELD_LABELS: Record<EnrollmentField, string> = {
  full_name: "Nome completo",
  whatsapp_phone: "WhatsApp com DDD",
  cpf: "CPF",
  birth_date: "Data de nascimento (DD/MM/AAAA)",
  marital_status: "Estado civil",
  nationality: "Nacionalidade",
  birthplace: "Naturalidade (cidade e estado)",
  cro: "CRO com estado",
  email: "E-mail",
  address: "Endereço completo, número e complemento",
  district: "Bairro",
  postal_code: "CEP",
};

const FIELD_ALIASES: Record<EnrollmentField, string[]> = {
  full_name: ["nome", "nome completo"],
  whatsapp_phone: ["whatsapp", "telefone", "celular", "whatsapp com ddd"],
  cpf: ["cpf"],
  birth_date: ["data de nascimento", "nascimento", "data nascimento"],
  marital_status: ["estado civil"],
  nationality: ["nacionalidade"],
  birthplace: ["naturalidade", "cidade natal", "local de nascimento"],
  cro: ["cro", "numero do cro", "registro cro"],
  email: ["email", "e-mail"],
  address: ["endereco", "endereco completo"],
  district: ["bairro"],
  postal_code: ["cep", "codigo postal"],
};

const ENROLLMENT_FORM = [
  "Parabéns pela sua decisão! Para iniciar sua matrícula, responda todos os dados abaixo em uma única mensagem, mantendo a numeração:",
  "",
  ...ENROLLMENT_FIELDS.map((field, index) => `${index + 1}. ${FIELD_LABELS[field]}:`),
].join("\n");

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatCurrency(value: number | null, currency: string | null): string | null {
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
    return new Intl.NumberFormat("pt-BR", {
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

function coursePresentation(course?: CatalogItemSnapshot): string[] {
  if (!course) {
    return [
      "Vou apresentar somente as informações confirmadas do curso selecionado.",
      "Agora quero entender seu momento profissional para te orientar melhor. Você já atua nessa área ou busca sua primeira formação nela?",
    ];
  }
  const investment = formatCurrency(course.investment, course.currency);
  const commercialTerms = course.effective_installment
    ?? course.installment_suggestion
    ?? course.investment_details;
  const formatDate = (value: string | null) => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR")
    : null;
  const details = [
    course.modality ? `modalidade ${course.modality}` : null,
    course.workload !== null ? `carga horária de ${course.workload} horas` : null,
    course.duration ? `duração de ${course.duration}` : null,
    commercialTerms
      ? `condições informadas: ${commercialTerms}`
      : investment ? `investimento de ${investment}` : null,
    course.registration_deadline
      ? `matrículas até ${formatDate(course.registration_deadline)}`
      : null,
    course.effective_start_date
      ? `início previsto em ${formatDate(course.effective_start_date)}`
      : null,
    course.available_vacancies !== null
      ? `${course.available_vacancies} vaga(s) disponíveis no momento`
      : null,
  ].filter(Boolean);
  return [
    course.differentials || course.description
      ? `${course.title}: ${course.differentials || course.description}`
      : `O curso selecionado é ${course.title}.`,
    details.length > 0
      ? `Informações atuais cadastradas no catálogo: ${details.join(", ")}.`
      : "As demais condições precisam ser confirmadas com a equipe responsável.",
    `Agora quero entender seu momento para te orientar melhor: você já atua com ${course.area ?? "essa área"} ou busca sua primeira formação nela?`,
  ];
}

function profileMatch(profile: AudienceProfile, course?: CatalogItemSnapshot): string {
  const title = course?.title ?? "essa formação";
  if (profile === "beginner") {
    return `Entendi. O programa de ${title} começa pelos fundamentos e avança para os conteúdos descritos no curso. Como a adequação depende da sua experiência e dos pré-requisitos, a equipe pode confirmar se a turma é indicada para o seu momento. Faz sentido para você?`;
  }
  return `Excelente. ${title} pode contribuir para aprofundar planejamento e técnicas da área, conforme o programa oficial. Faz sentido para o seu momento profissional?`;
}

function qualificationFrom(text: string): LeadQualification {
  const value = normalize(text);
  if (
    /\b(nao sou|nao|ainda nao|estudante|academico|academica|cursando)\b/u.test(value)
  ) {
    return "not_graduated";
  }
  if (/\b(sim|sou dentista|dentista|formado|formada|graduado|graduada)\b/u.test(value)) {
    return "graduated";
  }
  return "unknown";
}

function profileFrom(text: string): AudienceProfile {
  const value = normalize(text);
  if (
    /\b(nunca|primeiro passo|primeira formacao|primeira especializacao|comecando|comecar na area|iniciante|ainda nao faco)\b/u.test(
      value,
    )
  ) {
    return "beginner";
  }
  if (
    /\b(ja faco|ja realizo|atuo|experiencia|trabalho com|implantodontista|aprofundar|aperfeicoar)\b/u.test(
      value,
    )
  ) {
    return "experienced";
  }
  return "unknown";
}

function requestsEnrollment(text: string): boolean {
  const value = normalize(text);
  return (
    /\bquero me matricular\b/u.test(value)
    || /\b(quero|desejo|vamos)\b.{0,35}\b(iniciar|comecar|fazer|realizar|seguir com)\b.{0,25}\bmatricula\b/u.test(
      value,
    )
  );
}

function enrollmentDecision(): CommercialFlowDecision {
  return {
    handled: true,
    messages: [ENROLLMENT_FORM],
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
  if (/\b(nao|agora nao|nao tenho interesse|nao faz sentido)\b/u.test(value)) return false;
  if (
    requestsEnrollment(value)
    || /\b(sim|faz sentido|tenho interesse|quero continuar|quero seguir|vamos|pode ser|com certeza)\b/u.test(
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
): { valid: boolean; value: string; error?: string } {
  const value = rawValue.trim();
  if (value.length < 2) return { valid: false, value, error: "Esse dado parece incompleto." };

  if (field === "cpf") {
    const digits = value.replace(/\D/gu, "");
    return digits.length === 11
      ? { valid: true, value: digits }
      : { valid: false, value, error: "O CPF precisa ter 11 números." };
  }
  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    return { valid: false, value, error: "Esse e-mail não parece válido." };
  }
  if (field === "birth_date" && !/^\d{2}\/\d{2}\/\d{4}$/u.test(value)) {
    return { valid: false, value, error: "Informe a data no formato DD/MM/AAAA." };
  }
  if (field === "postal_code") {
    const digits = value.replace(/\D/gu, "");
    return digits.length === 8
      ? { valid: true, value: digits }
      : { valid: false, value, error: "O CEP precisa ter 8 números." };
  }
  if (field === "whatsapp_phone") {
    const digits = value.replace(/\D/gu, "");
    return digits.length >= 10 && digits.length <= 13
      ? { valid: true, value: digits }
      : { valid: false, value, error: "Informe um WhatsApp com DDD." };
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

function parseEnrollmentForm(text: string): EnrollmentData {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const result: EnrollmentData = {};
  const positionalValues: string[] = [];

  for (const line of lines) {
    const numbered = line.replace(/^(?:[-*]\s+|\d{1,2}\s*[.)-]\s*)/u, "").trim();
    const separator = numbered.search(/[:=]/u);
    if (separator > 0) {
      const field = fieldFromLabel(numbered.slice(0, separator));
      if (field) {
        result[field] = numbered.slice(separator + 1).trim();
        continue;
      }
    }
    positionalValues.push(numbered);
  }

  if (Object.keys(result).length === 0 && positionalValues.length === ENROLLMENT_FIELDS.length) {
    ENROLLMENT_FIELDS.forEach((field, index) => {
      result[field] = positionalValues[index] ?? "";
    });
  }

  return result;
}

function validateEnrollmentForm(text: string): {
  data: EnrollmentData;
  errors: string[];
} {
  const parsed = parseEnrollmentForm(text);
  const data: EnrollmentData = {};
  const errors: string[] = [];

  for (const field of ENROLLMENT_FIELDS) {
    const rawValue = parsed[field]?.trim();
    if (!rawValue) {
      errors.push(`${FIELD_LABELS[field]}: não informado.`);
      continue;
    }
    const validation = validateEnrollmentValue(field, rawValue);
    if (!validation.valid) {
      errors.push(`${FIELD_LABELS[field]}: ${validation.error ?? "valor inválido"}`);
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
): CommercialFlowDecision {
  if (context.flowStage === "presentation") {
    return {
      handled: true,
      messages: [PRESENTATION],
      patch: { flowStage: "qualification" },
    };
  }

  if (context.flowStage === "qualification") {
    const qualification = qualificationFrom(currentText);
    if (qualification === "unknown") return { handled: false, messages: [] };
    if (qualification === "not_graduated") {
      return {
        handled: true,
        messages: [NOT_GRADUATED],
        patch: { flowStage: "disqualified", leadQualification: qualification },
      };
    }
    return {
      handled: true,
      messages: coursePresentation(course),
      patch: { flowStage: "profile", leadQualification: qualification },
    };
  }

  if (context.flowStage === "profile") {
    if (
      context.leadQualification === "graduated"
      && requestsEnrollment(currentText)
    ) {
      return enrollmentDecision();
    }
    const profile = profileFrom(currentText);
    if (profile === "unknown") return { handled: false, messages: [] };
    return {
      handled: true,
      messages: [profileMatch(profile, course)],
      patch: { flowStage: "match", audienceProfile: profile },
    };
  }

  if (context.flowStage === "match") {
    const interest = confirmsInterest(currentText);
    if (interest === null) return { handled: false, messages: [] };
    if (!interest) {
      return {
        handled: true,
        messages: [
          "Tudo bem! Se surgir alguma dúvida sobre o curso, estou à disposição para ajudar.",
        ],
        patch: { interestConfirmed: false },
      };
    }
    const decision = enrollmentDecision();
    decision.notifyEnrollment = !context.enrollmentNotificationSent;
    return decision;
  }

  if (context.flowStage === "enrollment") {
    const validation = validateEnrollmentForm(currentText);
    if (validation.errors.length > 0) {
      return {
        handled: true,
        messages: [[
          "Não consegui validar todos os dados:",
          ...validation.errors.map((error) => `- ${error}`),
          "",
          "Por favor, corrija e reenvie a lista completa em uma única mensagem, mantendo a numeração.",
        ].join("\n")],
      };
    }
    return {
      handled: true,
      messages: [FINAL_MESSAGE],
      patch: {
        flowStage: "completed",
        enrollmentStep: ENROLLMENT_FIELDS.length,
      },
      enrollmentData: validation.data,
      handoffAfterFlow: {
        reason: "commercial_high_intent",
        details: "Dados de matrícula concluídos; contrato e pagamento exigem atendimento humano.",
      },
    };
  }

  return { handled: false, messages: [] };
}
