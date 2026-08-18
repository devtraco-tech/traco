import type { EnrollmentData, EnrollmentField } from "../domain/types.js";

export type KommoStageConfiguration = {
  pipelineId: number;
  newLeadStatusId: number;
  qualifiedStatusId: number;
  interestedStatusId: number;
  negotiationStatusId: number;
  handoffStatusId: number;
  dataCollectedStatusId: number;
};

export type KommoEnrollmentFieldConfiguration = Record<EnrollmentField, number>;

export type KommoRuntimeConfiguration = {
  stages: KommoStageConfiguration;
  enrollmentFields: KommoEnrollmentFieldConfiguration;
  handoff: {
    responsibleUserId: number;
    taskTypeId: number;
    deadlineMinutes: number;
  };
};

export type KommoLeadInput = {
  name: string;
  phoneE164: string;
  courseTitle: string;
  conversationId: string;
  statusId: number;
};

export type KommoLeadResult = {
  leadId: number;
  contactId: number | null;
  merged: boolean;
};

export type KommoHandoffInput = {
  responsibleUserId: number;
  taskTypeId: number;
  deadlineMinutes: number;
  taskText: string;
  noteText: string;
  requestId: string;
};

export type KommoPipelineOption = {
  id: number;
  name: string;
  statuses: Array<{ id: number; name: string; sort: number }>;
};

export type KommoPipelineProvisionResult = {
  pipeline: KommoPipelineOption;
  created: boolean;
};

const STANDARD_SDR_STAGES = [
  "Novo Lead",
  "Qualificado",
  "Interessado",
  "Em Negociação",
  "Dados Coletados",
  "Aguardando Humano",
] as const;

type Fetcher = typeof fetch;

export class KommoClient {
  private readonly baseUrl: string;

  constructor(
    private readonly subdomain: string,
    private readonly accessToken: string,
    private readonly stages: KommoStageConfiguration | null,
    private readonly fetcher: Fetcher = fetch,
  ) {
    if (!/^[a-z0-9-]+$/u.test(subdomain)) {
      throw new Error("Subdomínio Kommo inválido.");
    }
    this.baseUrl = `https://${subdomain}.kommo.com/api/v4`;
  }

  withStages(stages: KommoStageConfiguration): KommoClient {
    return new KommoClient(this.subdomain, this.accessToken, stages, this.fetcher);
  }

  async listPipelineOptions(): Promise<KommoPipelineOption[]> {
    const response = await this.request<Record<string, any>>("/leads/pipelines?limit=250");
    return ((response._embedded?.pipelines ?? []) as Array<Record<string, any>>).map(
      (pipeline) => ({
        id: Number(pipeline.id),
        name: String(pipeline.name),
        statuses: ((pipeline._embedded?.statuses ?? []) as Array<Record<string, any>>)
          .filter((status) => Number(status.type) === 0 && ![142, 143].includes(Number(status.id)))
          .map((status) => ({
            id: Number(status.id),
            name: String(status.name),
            sort: Number(status.sort),
          })),
      }),
    );
  }

  async createStandardPipeline(name: string): Promise<KommoPipelineProvisionResult> {
    const normalizedName = this.validateName(name, "Nome do funil");
    const existing = (await this.listPipelineOptions()).find(
      (pipeline) => pipeline.name.localeCompare(
        normalizedName,
        "pt-BR",
        { sensitivity: "accent" },
      ) === 0,
    );
    if (existing) return { pipeline: existing, created: false };

    const response = await this.request<Record<string, any>>("/leads/pipelines", {
      method: "POST",
      body: JSON.stringify([{
        name: normalizedName,
        sort: 500,
        is_main: false,
        is_unsorted_on: false,
        request_id: `sdr-pipeline-${Date.now()}`,
      }]),
    });
    const createdPipeline = response._embedded?.pipelines?.[0] ?? response[0];
    const pipelineId = Number(createdPipeline?.id);
    if (!Number.isSafeInteger(pipelineId) || pipelineId <= 0) {
      throw new Error("Kommo não retornou o ID do funil criado.");
    }

    let pipeline = (await this.listPipelineOptions()).find((item) => item.id === pipelineId);
    if (!pipeline) throw new Error("O funil foi criado, mas não pôde ser consultado no Kommo.");

    const stagesToCreate = [...STANDARD_SDR_STAGES];
    if (pipeline.statuses[0]) {
      await this.renamePipelineStage(pipelineId, pipeline.statuses[0].id, stagesToCreate.shift()!);
    }
    if (stagesToCreate.length > 0) {
      await this.request(`/leads/pipelines/${pipelineId}/statuses`, {
        method: "POST",
        body: JSON.stringify(stagesToCreate.map((stageName, index) => ({
          name: stageName,
          sort: (index + 2) * 10,
          request_id: `sdr-stage-${pipelineId}-${index + 2}`,
        }))),
      });
    }

    pipeline = (await this.listPipelineOptions()).find((item) => item.id === pipelineId);
    if (!pipeline) throw new Error("Não foi possível carregar o funil criado no Kommo.");
    return { pipeline, created: true };
  }

  async renamePipeline(
    pipelineId: number,
    name: string,
  ): Promise<{ pipeline: KommoPipelineOption; previousName: string }> {
    this.validatePositiveId(pipelineId, "Funil Kommo");
    const normalizedName = this.validateName(name, "Nome do funil");
    const pipelines = await this.listPipelineOptions();
    const current = pipelines.find((pipeline) => pipeline.id === pipelineId);
    if (!current) throw new Error("Funil Kommo não encontrado.");
    const duplicate = pipelines.find((pipeline) =>
      pipeline.id !== pipelineId
      && pipeline.name.localeCompare(
        normalizedName,
        "pt-BR",
        { sensitivity: "accent" },
      ) === 0,
    );
    if (duplicate) throw new Error("Já existe outro funil com esse nome no Kommo.");

    await this.request(`/leads/pipelines/${pipelineId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: normalizedName }),
    });
    return {
      previousName: current.name,
      pipeline: { ...current, name: normalizedName },
    };
  }

  async renamePipelineStage(
    pipelineId: number,
    stageId: number,
    name: string,
  ): Promise<{ pipeline: KommoPipelineOption; previousName: string }> {
    this.validatePositiveId(pipelineId, "Funil Kommo");
    this.validatePositiveId(stageId, "Etapa Kommo");
    const normalizedName = this.validateName(name, "Nome da coluna");
    const pipeline = (await this.listPipelineOptions()).find((item) => item.id === pipelineId);
    if (!pipeline) throw new Error("Funil Kommo não encontrado.");
    const current = pipeline.statuses.find((stage) => stage.id === stageId);
    if (!current) throw new Error("Coluna editável não encontrada nesse funil.");
    const duplicate = pipeline.statuses.find((stage) =>
      stage.id !== stageId
      && stage.name.localeCompare(
        normalizedName,
        "pt-BR",
        { sensitivity: "accent" },
      ) === 0,
    );
    if (duplicate) throw new Error("Já existe outra coluna com esse nome no funil.");

    await this.request(`/leads/pipelines/${pipelineId}/statuses/${stageId}`, {
      method: "PATCH",
      body: JSON.stringify({ name: normalizedName }),
    });
    return {
      previousName: current.name,
      pipeline: {
        ...pipeline,
        statuses: pipeline.statuses.map((stage) =>
          stage.id === stageId ? { ...stage, name: normalizedName } : stage),
      },
    };
  }

  async listAdminOptions(): Promise<{
    pipelines: Awaited<ReturnType<KommoClient["listPipelineOptions"]>>;
    users: Array<{ id: number; name: string; active: boolean }>;
    taskTypes: Array<{ id: number; name: string }>;
  }> {
    const [pipelines, usersResponse, account] = await Promise.all([
      this.listPipelineOptions(),
      this.request<Record<string, any>>("/users?limit=250"),
      this.request<Record<string, any>>("/account?with=task_types"),
    ]);
    return {
      pipelines,
      users: ((usersResponse._embedded?.users ?? []) as Array<Record<string, any>>).map(
        (user) => ({
          id: Number(user.id),
          name: String(user.name),
          active: Boolean(user.rights?.is_active),
        }),
      ),
      taskTypes: ((account._embedded?.task_types ?? []) as Array<Record<string, any>>).map(
        (taskType) => ({ id: Number(taskType.id), name: String(taskType.name) }),
      ),
    };
  }

  async validateHomologationPipeline(expectedName: string): Promise<void> {
    const stagesConfig = this.requireStages();
    const pipeline = await this.request<Record<string, any>>(
      `/leads/pipelines/${stagesConfig.pipelineId}`,
    );
    if (pipeline.name !== expectedName) {
      throw new Error(
        `Funil Kommo recusado: esperado "${expectedName}", recebido "${String(pipeline.name)}".`,
      );
    }

    const statuses = (pipeline._embedded?.statuses ?? []) as Array<Record<string, any>>;
    const expectedStatuses = [
      [stagesConfig.newLeadStatusId, "Novo Lead"],
      [stagesConfig.qualifiedStatusId, "Qualificado"],
      [stagesConfig.interestedStatusId, "Interessado"],
      [stagesConfig.negotiationStatusId, "Em Negociação"],
      [stagesConfig.dataCollectedStatusId, "Dados Coletados"],
      [stagesConfig.handoffStatusId, "Aguardando Humano"],
    ] as const;

    for (const [id, name] of expectedStatuses) {
      const status = statuses.find((candidate) => Number(candidate.id) === id);
      if (!status || status.name !== name) {
        throw new Error(`Etapa Kommo recusada: ${name} (${id}) não corresponde ao funil.`);
      }
    }
  }

  async createLead(input: KommoLeadInput): Promise<KommoLeadResult> {
    const stagesConfig = this.requireStages();
    if (!this.allowedStatusIds.has(input.statusId)) {
      throw new Error("Status Kommo não pertence à configuração autorizada.");
    }
    const phone = input.phoneE164.replace(/\D/gu, "");
    if (phone.length < 10 || phone.length > 15) {
      throw new Error("Telefone inválido para criação do contato Kommo.");
    }

    const response = await this.request<Record<string, any>>("/leads/complex", {
      method: "POST",
      body: JSON.stringify([{
        name: `${input.name} - ${input.courseTitle}`,
        pipeline_id: stagesConfig.pipelineId,
        status_id: input.statusId,
        _embedded: {
          tags: [{ name: "SDR TRAÇO" }],
          contacts: [{
            name: input.name,
            custom_fields_values: [{
              field_code: "PHONE",
              values: [{ value: `+${phone}`, enum_code: "MOB" }],
            }],
          }],
        },
        request_id: input.conversationId,
      }]),
    });

    const lead = response._embedded?.leads?.[0] ?? response[0];
    if (!lead?.id) {
      throw new Error("Kommo não retornou o ID do lead criado.");
    }
    return {
      leadId: Number(lead.id),
      contactId: lead.contact_id ? Number(lead.contact_id) : null,
      merged: Boolean(lead.merged),
    };
  }

  async ensureLead(input: KommoLeadInput): Promise<KommoLeadResult> {
    const stagesConfig = this.requireStages();
    const existing = await this.findLeadByPhone(input.phoneE164);
    if (existing?.leadId) {
      return { leadId: existing.leadId, contactId: existing.contactId, merged: true };
    }
    if (!existing?.contactId) return this.createLead(input);

    const response = await this.request<Record<string, any>>("/leads", {
      method: "POST",
      body: JSON.stringify([{
        name: `${input.name} - ${input.courseTitle}`,
        pipeline_id: stagesConfig.pipelineId,
        status_id: input.statusId,
        _embedded: {
          tags: [{ name: "SDR TRAÇO" }],
          contacts: [{ id: existing.contactId, is_main: true }],
        },
        request_id: input.conversationId,
      }]),
    });
    const lead = response._embedded?.leads?.[0];
    if (!lead?.id) throw new Error("Kommo não retornou o lead ligado ao contato existente.");
    return { leadId: Number(lead.id), contactId: existing.contactId, merged: false };
  }

  async updateEnrollmentFields(
    leadId: number,
    enrollmentData: EnrollmentData,
    fields: KommoEnrollmentFieldConfiguration,
  ): Promise<void> {
    const customFieldsValues = (Object.entries(enrollmentData) as Array<[EnrollmentField, string]>)
      .filter(([, value]) => Boolean(value))
      .map(([field, value]) => ({
        field_id: fields[field],
        values: [{ value }],
      }));
    if (customFieldsValues.length === 0) return;
    await this.request(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ custom_fields_values: customFieldsValues }),
    });
  }

  async updateLeadStage(leadId: number, statusId: number): Promise<void> {
    const stagesConfig = this.requireStages();
    if (!Number.isSafeInteger(leadId) || leadId <= 0) {
      throw new Error("ID do lead Kommo inválido.");
    }
    if (!this.allowedStatusIds.has(statusId)) {
      throw new Error("Status Kommo não pertence à configuração autorizada.");
    }
    await this.request(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({
        pipeline_id: stagesConfig.pipelineId,
        status_id: statusId,
      }),
    });
  }

  async prepareHumanHandoff(leadId: number, input: KommoHandoffInput): Promise<void> {
    await this.notifyResponsible(leadId, input);
  }

  async notifyResponsible(leadId: number, input: KommoHandoffInput): Promise<void> {
    if (!Number.isSafeInteger(leadId) || leadId <= 0) {
      throw new Error("ID do lead Kommo inválido.");
    }
    if (!Number.isSafeInteger(input.responsibleUserId) || input.responsibleUserId <= 0) {
      throw new Error("Responsável Kommo inválido.");
    }
    if (!Number.isSafeInteger(input.taskTypeId) || input.taskTypeId <= 0) {
      throw new Error("Tipo de tarefa Kommo inválido.");
    }
    if (!Number.isInteger(input.deadlineMinutes) || input.deadlineMinutes < 1) {
      throw new Error("Prazo de handoff Kommo inválido.");
    }

    await this.request(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({ responsible_user_id: input.responsibleUserId }),
    });
    await this.request("/tasks", {
      method: "POST",
      body: JSON.stringify([{
        task_type_id: input.taskTypeId,
        text: input.taskText,
        complete_till: Math.floor(Date.now() / 1000) + input.deadlineMinutes * 60,
        entity_id: leadId,
        entity_type: "leads",
        responsible_user_id: input.responsibleUserId,
        request_id: input.requestId,
      }]),
    });
    await this.request("/leads/notes", {
      method: "POST",
      body: JSON.stringify([{
        entity_id: leadId,
        note_type: "common",
        params: { text: input.noteText },
      }]),
    });
  }

  private get allowedStatusIds(): Set<number> {
    const stagesConfig = this.requireStages();
    return new Set([
      stagesConfig.newLeadStatusId,
      stagesConfig.qualifiedStatusId,
      stagesConfig.interestedStatusId,
      stagesConfig.negotiationStatusId,
      stagesConfig.handoffStatusId,
      stagesConfig.dataCollectedStatusId,
    ]);
  }

  private async findLeadByPhone(
    phoneE164: string,
  ): Promise<{ contactId: number; leadId: number | null } | null> {
    const phone = phoneE164.replace(/\D/gu, "");
    const response = await this.request<Record<string, any>>(
      `/contacts?query=${encodeURIComponent(phone)}&with=leads&limit=50`,
    );
    const contacts = ((response._embedded?.contacts ?? []) as Array<Record<string, any>>)
      .filter((contact) => {
        const customFields = (contact.custom_fields_values ?? []) as Array<Record<string, any>>;
        return customFields.some((field) =>
          field.field_code === "PHONE"
          && ((field.values ?? []) as Array<Record<string, any>>).some(
            (entry) => String(entry.value ?? "").replace(/\D/gu, "") === phone,
          ),
        );
      });
    if (contacts.length === 0) return null;

    for (const contact of contacts) {
      const linked = (contact._embedded?.leads ?? []) as Array<Record<string, any>>;
      for (const candidate of linked) {
        const lead = await this.request<Record<string, any>>(`/leads/${Number(candidate.id)}`);
        if (Number(lead.pipeline_id) === this.requireStages().pipelineId) {
          return { contactId: Number(contact.id), leadId: Number(lead.id) };
        }
      }
    }
    return { contactId: Number(contacts[0]?.id), leadId: null };
  }

  private requireStages(): KommoStageConfiguration {
    if (!this.stages) throw new Error("Mapeamento de etapas Kommo ainda não configurado.");
    return this.stages;
  }

  private validatePositiveId(value: number, label: string): void {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} inválido.`);
  }

  private validateName(value: string, label: string): string {
    const normalized = value.trim().replace(/\s+/gu, " ");
    if (normalized.length < 2 || normalized.length > 100) {
      throw new Error(`${label} deve ter entre 2 e 100 caracteres.`);
    }
    return normalized;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.accessToken}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Kommo API retornou HTTP ${response.status}.`);
    }
    return body as T;
  }
}
