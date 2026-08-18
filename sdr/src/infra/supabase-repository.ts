import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationContext,
  ConversationMessage,
  EnrollmentData,
  FlowStage,
  HandoffReason,
  InboundMessage,
  IngestResult,
} from "../domain/types.js";
import type { CatalogBinding, CatalogItemSnapshot } from "../domain/catalog.js";
import type { KommoRuntimeConfiguration } from "./kommo-client.js";

export type KommoAdminConfiguration = KommoRuntimeConfiguration & {
  enabled: boolean;
  subdomain: string;
};

export type KnowledgeDocument = {
  documentType: "faq" | "pdf" | "audience_matrix" | "commercial_script" | "follow_up";
  title: string;
  content: string;
  sourceUrl: string | null;
  metadata?: Record<string, unknown>;
};

export type TrainingDocumentSummary = KnowledgeDocument & {
  id: string;
  active: boolean;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type TrainingConfiguration = {
  version: string;
  script: string;
  documents: TrainingDocumentSummary[];
  readiness: {
    script: boolean;
    faq: boolean;
    audienceMatrix: boolean;
    followUps: boolean;
    followUpCadence: boolean;
    pdf: boolean;
    ready: boolean;
  };
};

type TrainingDocumentInput = {
  documentType: KnowledgeDocument["documentType"];
  title: string;
  content: string;
  active: boolean;
  metadata: Record<string, unknown>;
};

export class SdrRepository {
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async ingestInbound(
    message: InboundMessage,
    wahaSession: string,
  ): Promise<IngestResult> {
    const { data, error } = await this.client.rpc("sdr_ingest_inbound_message", {
      p_whatsapp_id: message.whatsappId,
      p_phone_e164: message.phoneE164,
      p_provider_message_id: message.providerMessageId,
      p_content: message.text,
      p_waha_session: wahaSession,
      p_display_name: message.displayName,
      p_occurred_at: message.occurredAt,
      p_raw_payload: message.rawPayload,
    });

    if (error) {
      throw new Error(`Falha ao persistir mensagem: ${error.message}`);
    }

    const result = data as Record<string, unknown>;
    return {
      duplicate: Boolean(result.duplicate),
      isNewLead: Boolean(result.is_new_lead),
      leadId: String(result.lead_id),
      conversationId: String(result.conversation_id),
      messageId: result.message_id ? String(result.message_id) : null,
    };
  }

  async restartConversationForMessage(
    conversationId: string,
    messageId: string,
    reason: "explicit_restart_request" | "new_greeting_with_course_interest",
  ): Promise<{
    restarted: boolean;
    conversationId: string;
    previousConversationId: string | null;
  }> {
    const { data, error } = await this.client.rpc(
      "sdr_restart_conversation_for_message",
      {
        p_conversation_id: conversationId,
        p_message_id: messageId,
        p_reason: reason,
      },
    );

    if (error) {
      throw new Error(`Falha ao reiniciar conversa: ${error.message}`);
    }

    const result = data as Record<string, unknown>;
    return {
      restarted: Boolean(result.restarted),
      conversationId: String(result.conversation_id),
      previousConversationId: result.previous_conversation_id
        ? String(result.previous_conversation_id)
        : null,
    };
  }

  async loadConversation(
    conversationId: string,
    messageLimit: number,
  ): Promise<ConversationContext> {
    const conversationResult = await this.client
      .from("sdr_conversations")
      .select(
        "id, lead_id, status, bot_enabled, waha_session, flow_stage, lead_qualification, audience_profile, interest_confirmed, enrollment_step, enrollment_notification_sent, configured_course_id, kommo_lead_id, kommo_contact_id, kommo_status_id, kommo_sync_status",
      )
      .eq("id", conversationId)
      .single();

    if (conversationResult.error) {
      throw new Error(`Conversa não encontrada: ${conversationResult.error.message}`);
    }

    const leadResult = await this.client
      .from("sdr_leads")
      .select("id, whatsapp_id, phone_e164, display_name")
      .eq("id", conversationResult.data.lead_id)
      .single();

    if (leadResult.error) {
      throw new Error(`Lead não encontrado: ${leadResult.error.message}`);
    }

    const messageResult = await this.client
      .from("sdr_messages")
      .select("id, direction, role, content, status, occurred_at")
      .eq("conversation_id", conversationId)
      .order("occurred_at", { ascending: false })
      .limit(messageLimit);

    if (messageResult.error) {
      throw new Error(`Falha ao carregar histórico: ${messageResult.error.message}`);
    }

    const enrollmentResult = await this.client
      .from("sdr_enrollment_profiles")
      .select(
        "full_name, whatsapp_phone, cpf, birth_date, marital_status, nationality, birthplace, cro, email, address, district, postal_code",
      )
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (enrollmentResult.error) {
      throw new Error(
        `Falha ao carregar dados de matrícula: ${enrollmentResult.error.message}`,
      );
    }

    const messages: ConversationMessage[] = messageResult.data
      .map((row) => ({
        id: String(row.id),
        direction: row.direction as ConversationMessage["direction"],
        role: row.role as ConversationMessage["role"],
        content: String(row.content),
        status: row.status as ConversationMessage["status"],
        createdAt: String(row.occurred_at),
      }))
      .reverse();

    return {
      conversationId: String(conversationResult.data.id),
      leadId: String(leadResult.data.id),
      whatsappId: String(leadResult.data.whatsapp_id),
      phoneE164: String(leadResult.data.phone_e164),
      displayName: leadResult.data.display_name
        ? String(leadResult.data.display_name)
        : null,
      status: conversationResult.data.status as ConversationContext["status"],
      botEnabled: Boolean(conversationResult.data.bot_enabled),
      flowStage: conversationResult.data.flow_stage as ConversationContext["flowStage"],
      leadQualification: conversationResult.data
        .lead_qualification as ConversationContext["leadQualification"],
      audienceProfile: conversationResult.data
        .audience_profile as ConversationContext["audienceProfile"],
      interestConfirmed:
        typeof conversationResult.data.interest_confirmed === "boolean"
          ? conversationResult.data.interest_confirmed
          : null,
      enrollmentStep: Number(conversationResult.data.enrollment_step),
      enrollmentNotificationSent: Boolean(
        conversationResult.data.enrollment_notification_sent,
      ),
      configuredCourseId: conversationResult.data.configured_course_id
        ? String(conversationResult.data.configured_course_id)
        : null,
      kommoLeadId: conversationResult.data.kommo_lead_id === null
        ? null
        : Number(conversationResult.data.kommo_lead_id),
      kommoContactId: conversationResult.data.kommo_contact_id === null
        ? null
        : Number(conversationResult.data.kommo_contact_id),
      kommoStatusId: conversationResult.data.kommo_status_id === null
        ? null
        : Number(conversationResult.data.kommo_status_id),
      kommoSyncStatus: conversationResult.data.kommo_sync_status as ConversationContext["kommoSyncStatus"],
      wahaSession: String(conversationResult.data.waha_session),
      enrollmentData: (enrollmentResult.data ?? {}) as EnrollmentData,
      messages,
    };
  }

  async updateFlowState(
    conversationId: string,
    patch: {
      flowStage?: FlowStage;
      leadQualification?: ConversationContext["leadQualification"];
      audienceProfile?: ConversationContext["audienceProfile"];
      interestConfirmed?: boolean;
      enrollmentStep?: number;
      enrollmentNotificationSent?: boolean;
    },
  ): Promise<void> {
    const values: Record<string, unknown> = {};
    if (patch.flowStage !== undefined) values.flow_stage = patch.flowStage;
    if (patch.leadQualification !== undefined) {
      values.lead_qualification = patch.leadQualification;
    }
    if (patch.audienceProfile !== undefined) {
      values.audience_profile = patch.audienceProfile;
    }
    if (patch.interestConfirmed !== undefined) {
      values.interest_confirmed = patch.interestConfirmed;
    }
    if (patch.enrollmentStep !== undefined) values.enrollment_step = patch.enrollmentStep;
    if (patch.enrollmentNotificationSent !== undefined) {
      values.enrollment_notification_sent = patch.enrollmentNotificationSent;
    }
    if (Object.keys(values).length === 0) return;

    const { error } = await this.client
      .from("sdr_conversations")
      .update(values)
      .eq("id", conversationId);

    if (error) {
      throw new Error(`Falha ao avançar fluxo comercial: ${error.message}`);
    }
  }

  async saveEnrollmentData(
    conversationId: string,
    enrollmentData: EnrollmentData,
    completed: boolean,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      conversation_id: conversationId,
      ...enrollmentData,
    };
    if (completed) payload.completed_at = new Date().toISOString();

    const { error } = await this.client
      .from("sdr_enrollment_profiles")
      .upsert(payload, { onConflict: "conversation_id" });

    if (error) {
      throw new Error(`Falha ao salvar dados de matrícula: ${error.message}`);
    }
  }

  async markMessagesContainingPersonalData(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    const { error } = await this.client
      .from("sdr_messages")
      .update({ contains_personal_data: true })
      .in("id", messageIds);

    if (error) {
      throw new Error(`Falha ao classificar mensagem com dados pessoais: ${error.message}`);
    }
  }

  async saveKommoSync(
    conversationId: string,
    values: {
      leadId: number;
      contactId?: number | null;
      statusId: number;
    },
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      kommo_lead_id: values.leadId,
      kommo_status_id: values.statusId,
      kommo_sync_status: "synced",
      kommo_last_synced_at: new Date().toISOString(),
      kommo_sync_error: null,
    };
    if (values.contactId !== undefined) {
      payload.kommo_contact_id = values.contactId;
    }
    const { error } = await this.client
      .from("sdr_conversations")
      .update(payload)
      .eq("id", conversationId);
    if (error) {
      throw new Error(`Falha ao salvar vínculo Kommo: ${error.message}`);
    }
  }

  async markKommoSyncFailed(conversationId: string, message: string): Promise<void> {
    const { error } = await this.client
      .from("sdr_conversations")
      .update({
        kommo_sync_status: "failed",
        kommo_sync_error: message.slice(0, 1_000),
      })
      .eq("id", conversationId);
    if (error) {
      throw new Error(`Falha ao auditar erro Kommo: ${error.message}`);
    }
  }

  async claimQueuedMessages(conversationId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("sdr_messages")
      .update({ status: "processing" })
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .eq("status", "queued")
      .select("id");

    if (error) {
      throw new Error(`Falha ao reservar mensagens: ${error.message}`);
    }

    return data.map((row) => String(row.id));
  }

  async markMessages(
    messageIds: string[],
    status: "sent" | "failed" | "ignored",
    errorMessage?: string,
  ): Promise<void> {
    if (messageIds.length === 0) return;

    const { error } = await this.client
      .from("sdr_messages")
      .update({
        status,
        error_message: errorMessage ?? null,
      })
      .in("id", messageIds);

    if (error) {
      throw new Error(`Falha ao atualizar mensagens: ${error.message}`);
    }
  }

  async discardQueuedMessages(reason: string): Promise<number> {
    const { data, error } = await this.client
      .from("sdr_messages")
      .update({ status: "ignored", error_message: reason })
      .eq("direction", "inbound")
      .eq("status", "queued")
      .select("id");
    if (error) {
      throw new Error(`Falha ao descartar mensagens pendentes: ${error.message}`);
    }
    return data.length;
  }

  async requeueProcessingMessages(conversationId: string): Promise<number> {
    const { data, error } = await this.client
      .from("sdr_messages")
      .update({ status: "queued", error_message: null })
      .eq("conversation_id", conversationId)
      .eq("direction", "inbound")
      .eq("status", "processing")
      .select("id");
    if (error) {
      throw new Error(`Falha ao recuperar mensagens em processamento: ${error.message}`);
    }
    return data.length;
  }

  async createOutboundMessage(
    conversationId: string,
    content: string,
    model: string,
  ): Promise<string> {
    const { data, error } = await this.client
      .from("sdr_messages")
      .insert({
        conversation_id: conversationId,
        direction: "outbound",
        role: "assistant",
        content,
        status: "processing",
        model,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Falha ao registrar resposta: ${error.message}`);
    }

    return String(data.id);
  }

  async markOutboundSent(messageId: string, providerMessageId?: string): Promise<void> {
    const { error } = await this.client
      .from("sdr_messages")
      .update({
        status: "sent",
        provider_message_id: providerMessageId ?? null,
      })
      .eq("id", messageId);

    if (error) {
      throw new Error(`Falha ao confirmar resposta: ${error.message}`);
    }
  }

  async markOutboundFailed(messageId: string, errorMessage: string): Promise<void> {
    const { error } = await this.client
      .from("sdr_messages")
      .update({ status: "failed", error_message: errorMessage })
      .eq("id", messageId);

    if (error) {
      throw new Error(`Falha ao registrar erro de envio: ${error.message}`);
    }
  }

  async requestHandoff(
    conversationId: string,
    reason: HandoffReason,
    details?: string,
  ): Promise<string> {
    const { data, error } = await this.client.rpc("sdr_request_handoff", {
      p_conversation_id: conversationId,
      p_reason: reason,
      p_details: details ?? null,
    });

    if (error) {
      throw new Error(`Falha ao solicitar atendimento humano: ${error.message}`);
    }

    return String(data);
  }

  async getCatalogBinding(wahaSession: string): Promise<CatalogBinding | null> {
    const { data, error } = await this.client
      .from("sdr_robot_configs")
      .select("catalog_item_id, catalog_item_slug, catalog_item_snapshot, catalog_item_synced_at")
      .eq("waha_session", wahaSession)
      .maybeSingle();

    if (error) throw new Error(`Falha ao carregar item de catálogo vinculado: ${error.message}`);
    if (!data?.catalog_item_id || !data.catalog_item_snapshot || !data.catalog_item_synced_at) return null;
    return {
      itemId: String(data.catalog_item_id),
      slug: data.catalog_item_slug ? String(data.catalog_item_slug) : null,
      snapshot: data.catalog_item_snapshot as CatalogItemSnapshot,
      syncedAt: String(data.catalog_item_synced_at),
    };
  }

  async bindCatalogItem(
    wahaSession: string,
    snapshot: CatalogItemSnapshot,
    provider: { id: string; name: string },
  ): Promise<CatalogBinding> {
    const syncedAt = new Date().toISOString();
    const { error } = await this.client.from("sdr_robot_configs").upsert(
      {
        waha_session: wahaSession,
        catalog_item_id: snapshot.id,
        catalog_item_slug: snapshot.slug,
        catalog_item_snapshot: snapshot,
        catalog_item_synced_at: syncedAt,
        catalog_provider_id: provider.id,
        catalog_provider_name: provider.name,
      },
      { onConflict: "waha_session" },
    );
    if (error) throw new Error(`Falha ao vincular item do catálogo ao SDR: ${error.message}`);
    return { itemId: snapshot.id, slug: snapshot.slug, snapshot, syncedAt };
  }

  async getKommoConfiguration(
    wahaSession: string,
  ): Promise<KommoAdminConfiguration | null> {
    const { data, error } = await this.client
      .from("sdr_robot_configs")
      .select("kommo_enabled, kommo_subdomain, kommo_pipeline_id, kommo_stage_mappings, kommo_field_mappings, kommo_responsible_user_id, kommo_handoff_task_type_id, kommo_handoff_deadline_minutes")
      .eq("waha_session", wahaSession)
      .maybeSingle();
    if (error) throw new Error(`Falha ao carregar configuração Kommo: ${error.message}`);
    if (!data?.kommo_pipeline_id || !data.kommo_subdomain) return null;
    const stages = (data.kommo_stage_mappings ?? {}) as Record<string, unknown>;
    const fields = (data.kommo_field_mappings ?? {}) as Record<string, unknown>;
    const requiredNumber = (source: Record<string, unknown>, key: string): number => {
      const value = Number(source[key]);
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`Configuração Kommo inválida no campo ${key}.`);
      }
      return value;
    };
    return {
      enabled: Boolean(data.kommo_enabled),
      subdomain: String(data.kommo_subdomain),
      stages: {
        pipelineId: Number(data.kommo_pipeline_id),
        newLeadStatusId: requiredNumber(stages, "newLead"),
        qualifiedStatusId: requiredNumber(stages, "qualified"),
        interestedStatusId: requiredNumber(stages, "interested"),
        negotiationStatusId: requiredNumber(stages, "negotiation"),
        dataCollectedStatusId: requiredNumber(stages, "dataCollected"),
        handoffStatusId: requiredNumber(stages, "awaitingHuman"),
      },
      enrollmentFields: {
        full_name: requiredNumber(fields, "full_name"),
        whatsapp_phone: requiredNumber(fields, "whatsapp_phone"),
        cpf: requiredNumber(fields, "cpf"),
        birth_date: requiredNumber(fields, "birth_date"),
        marital_status: requiredNumber(fields, "marital_status"),
        nationality: requiredNumber(fields, "nationality"),
        birthplace: requiredNumber(fields, "birthplace"),
        cro: requiredNumber(fields, "cro"),
        email: requiredNumber(fields, "email"),
        address: requiredNumber(fields, "address"),
        district: requiredNumber(fields, "district"),
        postal_code: requiredNumber(fields, "postal_code"),
      },
      handoff: {
        responsibleUserId: Number(data.kommo_responsible_user_id),
        taskTypeId: Number(data.kommo_handoff_task_type_id),
        deadlineMinutes: Number(data.kommo_handoff_deadline_minutes),
      },
    };
  }

  async saveKommoConfiguration(
    wahaSession: string,
    configuration: KommoAdminConfiguration,
  ): Promise<KommoAdminConfiguration> {
    const configId = await this.ensureRobotConfig(wahaSession);
    const { error } = await this.client
      .from("sdr_robot_configs")
      .update({
        kommo_enabled: configuration.enabled,
        kommo_subdomain: configuration.subdomain,
        kommo_pipeline_id: configuration.stages.pipelineId,
        kommo_stage_mappings: {
          newLead: configuration.stages.newLeadStatusId,
          qualified: configuration.stages.qualifiedStatusId,
          interested: configuration.stages.interestedStatusId,
          negotiation: configuration.stages.negotiationStatusId,
          dataCollected: configuration.stages.dataCollectedStatusId,
          awaitingHuman: configuration.stages.handoffStatusId,
        },
        kommo_field_mappings: configuration.enrollmentFields,
        kommo_responsible_user_id: configuration.handoff.responsibleUserId,
        kommo_handoff_task_type_id: configuration.handoff.taskTypeId,
        kommo_handoff_deadline_minutes: configuration.handoff.deadlineMinutes,
      })
      .eq("id", configId);
    if (error) throw new Error(`Falha ao salvar configuração Kommo: ${error.message}`);
    return configuration;
  }

  async recordAdminAudit(input: {
    actorUserId: string;
    action: "kommo_pipeline_created" | "kommo_pipeline_renamed" | "kommo_stage_renamed";
    targetType: "kommo_pipeline" | "kommo_stage";
    targetExternalId: string;
    previousState?: Record<string, unknown> | null;
    newState: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.client.from("sdr_admin_audit_logs").insert({
      actor_user_id: input.actorUserId,
      action: input.action,
      target_type: input.targetType,
      target_external_id: input.targetExternalId,
      previous_state: input.previousState ?? null,
      new_state: input.newState,
    });
    if (error) throw new Error(`Falha ao registrar auditoria administrativa: ${error.message}`);
  }

  private async ensureRobotConfig(wahaSession: string): Promise<string> {
    const existing = await this.client
      .from("sdr_robot_configs")
      .select("id")
      .eq("waha_session", wahaSession)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`Falha ao carregar configuração do SDR: ${existing.error.message}`);
    }
    if (existing.data) return String(existing.data.id);

    const created = await this.client
      .from("sdr_robot_configs")
      .insert({
        waha_session: wahaSession,
        name: "Assistente Comercial Traço",
        is_active: true,
      })
      .select("id")
      .single();
    if (created.error) {
      throw new Error(`Falha ao criar configuração do SDR: ${created.error.message}`);
    }
    return String(created.data.id);
  }

  async getTrainingConfiguration(wahaSession: string): Promise<TrainingConfiguration> {
    const configResult = await this.client
      .from("sdr_robot_configs")
      .select("id, script_version")
      .eq("waha_session", wahaSession)
      .maybeSingle();
    if (configResult.error) {
      throw new Error(`Falha ao carregar treinamento do SDR: ${configResult.error.message}`);
    }
    if (!configResult.data) return this.buildTrainingConfiguration("", []);

    const documentsResult = await this.client
      .from("sdr_knowledge_documents")
      .select("id, document_type, title, content, source_url, is_active, metadata, updated_at")
      .eq("robot_config_id", configResult.data.id)
      .order("updated_at", { ascending: false });
    if (documentsResult.error) {
      throw new Error(`Falha ao carregar materiais de treinamento: ${documentsResult.error.message}`);
    }

    const documents = documentsResult.data.map((row) => ({
      id: String(row.id),
      documentType: row.document_type as KnowledgeDocument["documentType"],
      title: String(row.title),
      content: String(row.content),
      sourceUrl: row.source_url ? String(row.source_url) : null,
      active: Boolean(row.is_active),
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      updatedAt: String(row.updated_at),
    }));
    return this.buildTrainingConfiguration(
      configResult.data.script_version ? String(configResult.data.script_version) : "",
      documents,
    );
  }

  async installOfficialTraining(
    wahaSession: string,
    documents: TrainingDocumentInput[],
    version: string,
  ): Promise<TrainingConfiguration> {
    const configId = await this.ensureRobotConfig(wahaSession);
    const configUpdate = await this.client
      .from("sdr_robot_configs")
      .update({ is_active: true, script_version: version })
      .eq("id", configId);
    if (configUpdate.error) {
      throw new Error(`Falha ao ativar treinamento do SDR: ${configUpdate.error.message}`);
    }

    const deactivateResult = await this.client
      .from("sdr_knowledge_documents")
      .update({ is_active: false })
      .eq("robot_config_id", configId);
    if (deactivateResult.error) {
      throw new Error(
        `Falha ao desativar versões antigas do treinamento: ${deactivateResult.error.message}`,
      );
    }

    for (const document of documents) {
      const existing = await this.client
        .from("sdr_knowledge_documents")
        .select("id")
        .eq("robot_config_id", configId)
        .eq("document_type", document.documentType)
        .eq("title", document.title)
        .maybeSingle();
      if (existing.error) {
        throw new Error(`Falha ao verificar material ${document.title}: ${existing.error.message}`);
      }
      const payload = {
        robot_config_id: configId,
        document_type: document.documentType,
        title: document.title,
        content: document.content,
        is_active: document.active,
        metadata: document.metadata,
      };
      const result = existing.data
        ? await this.client.from("sdr_knowledge_documents").update(payload).eq("id", existing.data.id)
        : await this.client.from("sdr_knowledge_documents").insert(payload);
      if (result.error) {
        throw new Error(`Falha ao salvar material ${document.title}: ${result.error.message}`);
      }
    }

    return this.getTrainingConfiguration(wahaSession);
  }

  async saveCommercialScript(
    wahaSession: string,
    script: string,
    version: string,
  ): Promise<TrainingConfiguration> {
    const configId = await this.ensureRobotConfig(wahaSession);
    const existing = await this.client
      .from("sdr_knowledge_documents")
      .select("id")
      .eq("robot_config_id", configId)
      .eq("document_type", "commercial_script")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing.error) {
      throw new Error(`Falha ao carregar script comercial: ${existing.error.message}`);
    }
    const payload = {
      robot_config_id: configId,
      document_type: "commercial_script",
      title: "Script Comercial US-03",
      content: script,
      is_active: true,
      metadata: { version, source: "configuration_ui" },
    };
    const documentResult = existing.data
      ? await this.client.from("sdr_knowledge_documents").update(payload).eq("id", existing.data.id)
      : await this.client.from("sdr_knowledge_documents").insert(payload);
    if (documentResult.error) {
      throw new Error(`Falha ao salvar script comercial: ${documentResult.error.message}`);
    }
    const configResult = await this.client
      .from("sdr_robot_configs")
      .update({ is_active: true, script_version: version })
      .eq("id", configId);
    if (configResult.error) {
      throw new Error(`Falha ao versionar script comercial: ${configResult.error.message}`);
    }
    return this.getTrainingConfiguration(wahaSession);
  }

  private buildTrainingConfiguration(
    version: string,
    documents: TrainingDocumentSummary[],
  ): TrainingConfiguration {
    const active = (type: KnowledgeDocument["documentType"]) =>
      documents.some((document) => document.documentType === type && document.active);
    const scriptDocument = documents.find(
      (document) => document.documentType === "commercial_script" && document.active,
    );
    const followUp = documents.find((document) => document.documentType === "follow_up");
    const script = scriptDocument?.content ?? "";
    const readiness = {
      script: script.trim().length >= 80,
      faq: active("faq"),
      audienceMatrix: active("audience_matrix"),
      followUps: Boolean(followUp),
      followUpCadence:
        Boolean(followUp?.active) && followUp?.metadata.cadenceStatus === "configured",
      pdf: active("pdf"),
      ready: false,
    };
    readiness.ready = readiness.script && readiness.faq && readiness.audienceMatrix;
    return { version, script, documents, readiness };
  }

  async listActiveKnowledge(wahaSession: string): Promise<KnowledgeDocument[]> {
    const configResult = await this.client
      .from("sdr_robot_configs")
      .select("id")
      .eq("waha_session", wahaSession)
      .eq("is_active", true)
      .maybeSingle();

    if (configResult.error) {
      throw new Error(`Falha ao carregar configuração do SDR: ${configResult.error.message}`);
    }
    if (!configResult.data) return [];

    const { data, error } = await this.client
      .from("sdr_knowledge_documents")
      .select("document_type, title, content, source_url, metadata")
      .eq("robot_config_id", configResult.data.id)
      .eq("is_active", true);

    if (error) {
      throw new Error(`Falha ao carregar base de conhecimento: ${error.message}`);
    }

    return data.map((row) => ({
      documentType: row.document_type as KnowledgeDocument["documentType"],
      title: String(row.title),
      content: String(row.content),
      sourceUrl: row.source_url ? String(row.source_url) : null,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
    }));
  }

  async recordEvent(
    eventType:
      | "message_queued"
      | "processing_started"
      | "response_sent"
      | "notification_sent"
      | "enrollment_follow_up_scheduled"
      | "enrollment_follow_up_sent"
      | "error",
    conversationId: string,
    leadId: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.client.from("sdr_events").insert({
      conversation_id: conversationId,
      lead_id: leadId,
      event_type: eventType,
      payload,
    });

    if (error) {
      throw new Error(`Falha ao registrar evento: ${error.message}`);
    }
  }

  async recordNotification(
    conversationId: string | null,
    eventType: string,
    status: "sent" | "failed",
    payload: Record<string, unknown>,
    errorMessage?: string,
  ): Promise<void> {
    const { error } = await this.client.from("sdr_notification_deliveries").insert({
      conversation_id: conversationId,
      event_type: eventType,
      channel: "email",
      destination: "ALERT_EMAIL_TO",
      status,
      payload,
      error_message: errorMessage ?? null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    if (error) {
      throw new Error(`Falha ao auditar notificação: ${error.message}`);
    }
  }
}
