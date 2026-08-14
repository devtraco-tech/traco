export type InboundMessage = {
  providerMessageId: string;
  whatsappId: string;
  phoneE164: string;
  displayName: string | null;
  text: string;
  occurredAt: string;
  rawPayload: Record<string, unknown>;
};

export type IngestResult = {
  duplicate: boolean;
  isNewLead: boolean;
  leadId: string;
  conversationId: string;
  messageId: string | null;
};

export type ConversationMessage = {
  id: string;
  direction: "inbound" | "outbound";
  role: "user" | "assistant" | "system";
  content: string;
  status: "received" | "queued" | "processing" | "sent" | "failed" | "ignored";
  createdAt: string;
};

export type ConversationContext = {
  conversationId: string;
  leadId: string;
  whatsappId: string;
  phoneE164: string;
  displayName: string | null;
  status: "bot_active" | "waiting_human" | "human_active" | "resolved" | "closed";
  botEnabled: boolean;
  flowStage: FlowStage;
  leadQualification: LeadQualification;
  audienceProfile: AudienceProfile;
  interestConfirmed: boolean | null;
  enrollmentStep: number;
  enrollmentNotificationSent: boolean;
  configuredCourseId: string | null;
  kommoLeadId: number | null;
  kommoContactId: number | null;
  kommoStatusId: number | null;
  kommoSyncStatus: "not_synced" | "synced" | "failed";
  wahaSession: string;
  enrollmentData: EnrollmentData;
  messages: ConversationMessage[];
};

export type FlowStage =
  | "presentation"
  | "qualification"
  | "profile"
  | "match"
  | "enrollment"
  | "completed"
  | "disqualified";

export type LeadQualification = "unknown" | "graduated" | "not_graduated";

export type AudienceProfile = "unknown" | "beginner" | "experienced";

export const ENROLLMENT_FIELDS = [
  "full_name",
  "whatsapp_phone",
  "cpf",
  "birth_date",
  "marital_status",
  "nationality",
  "birthplace",
  "cro",
  "email",
  "address",
  "district",
  "postal_code",
] as const;

export type EnrollmentField = (typeof ENROLLMENT_FIELDS)[number];
export type EnrollmentData = Partial<Record<EnrollmentField, string>>;

export type HandoffReason =
  | "explicit_request"
  | "unknown_answer"
  | "ai_unavailable"
  | "waha_unavailable"
  | "commercial_high_intent"
  | "sensitive_topic"
  | "repeated_failure"
  | "manual"
  | "other";
