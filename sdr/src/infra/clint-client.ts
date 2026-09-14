import type { EnrollmentData, EnrollmentField } from "../domain/types.js";

export type ClintStageConfiguration = {
  originId: string;
  newLeadStageId: string;
  qualifiedStageId: string;
  interestedStageId: string;
  negotiationStageId: string;
  dataCollectedStageId: string;
  handoffStageId: string;
};

type ClintBuiltInEnrollmentField = "full_name" | "whatsapp_phone" | "email";
type ClintCustomEnrollmentField = Exclude<EnrollmentField, ClintBuiltInEnrollmentField>;

export type ClintEnrollmentFieldConfiguration = Record<ClintCustomEnrollmentField, string>;

export type ClintRuntimeConfiguration = {
  stages: ClintStageConfiguration;
  enrollmentFields: ClintEnrollmentFieldConfiguration;
  handoff: {
    responsibleUserId: string;
    noteFieldId?: string;
  };
};

export type ClintDealInput = {
  name: string;
  contactName?: string | null;
  phoneE164: string;
  courseTitle: string;
  stageId: string;
};

export type ClintDealResult = {
  dealId: string;
  contactId: string | null;
  merged: boolean;
};

type Fetcher = typeof fetch;

type ClintContact = {
  id: string;
  name: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export class ClintClient {
  constructor(
    private readonly apiToken: string,
    private readonly stages: ClintStageConfiguration,
    private readonly fetcher: Fetcher = fetch,
    private readonly baseUrl = "https://api.clint.digital/v1",
  ) {
    if (!apiToken.trim()) throw new Error("Token da Clint não configurado.");
    this.validateUuid(stages.originId, "Origem Clint");
    for (const stageId of this.allowedStageIds) this.validateUuid(stageId, "Etapa Clint");
  }

  async ensureDeal(input: ClintDealInput): Promise<ClintDealResult> {
    this.validateStage(input.stageId);
    const phone = this.normalizePhone(input.phoneE164);
    const contactName = this.normalizeContactName(input.contactName);
    const existing = await this.findDealByPhone(phone);
    if (existing) {
      const contactId = await this.syncContactName({
        contactId: existing.contactId,
        phoneE164: input.phoneE164,
        name: contactName,
      });
      return {
        ...existing,
        contactId,
        merged: true,
      };
    }

    let contact = await this.findContactByPhone(phone);
    if (contact && contactName && this.shouldReplaceContactName(contact.name, phone)) {
      await this.updateContactName(contact.id, contactName);
      contact = { ...contact, name: contactName };
    } else if (!contact && contactName) {
      contact = await this.createContact(phone, contactName);
    }
    const response = await this.request<Record<string, unknown>>("/deals", {
      method: "POST",
      body: JSON.stringify({
        origin_id: this.stages.originId,
        stage_id: input.stageId,
        name: `${input.name} - ${input.courseTitle}`,
        ...(contact ? { contact_id: contact.id } : { phone }),
      }),
    });
    const deal = this.unwrapObject(response, "deal");
    const dealId = this.readUuid(deal, "id", "A Clint não retornou o ID do negócio criado.");
    return {
      dealId,
      contactId: this.optionalUuid(deal.contact_id) ?? contact?.id ?? null,
      merged: false,
    };
  }

  async syncContactName(input: {
    contactId?: string | null;
    phoneE164: string;
    name?: string | null;
  }): Promise<string | null> {
    const contactName = this.normalizeContactName(input.name);
    if (!contactName) return input.contactId ?? null;
    const phone = this.normalizePhone(input.phoneE164);
    const contact = input.contactId
      ? await this.getContact(input.contactId)
      : await this.findContactByPhone(phone);
    if (contact && this.shouldReplaceContactName(contact.name, phone)) {
      await this.updateContactName(contact.id, contactName);
    }
    return contact?.id ?? input.contactId ?? null;
  }

  async updateDealStage(dealId: string, stageId: string): Promise<void> {
    this.validateUuid(dealId, "Negócio Clint");
    this.validateStage(stageId);
    await this.request(`/deals/${dealId}`, {
      method: "POST",
      body: JSON.stringify({ origin_id: this.stages.originId, stage_id: stageId }),
    });
  }

  async updateEnrollmentFields(
    dealId: string,
    enrollmentData: EnrollmentData,
    fields: ClintEnrollmentFieldConfiguration,
  ): Promise<void> {
    this.validateUuid(dealId, "Negócio Clint");
    const {
      full_name: _fullName,
      whatsapp_phone: _whatsappPhone,
      email,
      ...customEnrollmentData
    } = enrollmentData;
    const customValues = Object.fromEntries(
      (Object.entries(customEnrollmentData) as Array<[ClintCustomEnrollmentField, string]>)
        .filter(([, value]) => Boolean(value))
        .map(([field, value]) => [fields[field], value]),
    );
    const body = {
      ...(email ? { email } : {}),
      ...(Object.keys(customValues).length > 0 ? { fields: customValues } : {}),
    };
    if (Object.keys(body).length === 0) return;
    await this.request(`/deals/${dealId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async prepareHumanHandoff(
    dealId: string,
    input: { responsibleUserId: string; noteFieldId?: string; noteText: string },
  ): Promise<void> {
    this.validateUuid(dealId, "Negócio Clint");
    this.validateUuid(input.responsibleUserId, "Responsável Clint");
    if (input.noteFieldId) this.validateFieldKey(input.noteFieldId, "Campo de observação Clint");
    await this.request(`/deals/${dealId}`, {
      method: "POST",
      body: JSON.stringify({
        user_id: input.responsibleUserId,
        ...(input.noteFieldId ? { fields: { [input.noteFieldId]: input.noteText } } : {}),
      }),
    });
  }

  async listOrigins(): Promise<Array<Record<string, unknown>>> {
    const response = await this.request<unknown>("/origins?limit=1000");
    return this.unwrapList(response, "origins");
  }

  async listUsers(): Promise<Array<Record<string, unknown>>> {
    const response = await this.request<unknown>("/users?limit=1000");
    return this.unwrapList(response, "users");
  }

  async listFields(): Promise<Array<Record<string, unknown>>> {
    const response = await this.request<unknown>("/account/fields");
    return this.unwrapFields(response);
  }

  private async findDealByPhone(phone: string): Promise<{ dealId: string; contactId: string | null } | null> {
    const response = await this.request<unknown>(
      `/deals?origin_id=${encodeURIComponent(this.stages.originId)}&phone=${encodeURIComponent(phone)}&status=OPEN&limit=1000`,
    );
    const deal = this.unwrapList(response, "deals")[0];
    if (!deal) return null;
    return {
      dealId: this.readUuid(deal, "id", "Negócio Clint encontrado sem ID válido."),
      contactId: this.optionalUuid(deal.contact_id),
    };
  }

  private async findContactByPhone(phone: string): Promise<ClintContact | null> {
    const response = await this.request<unknown>(
      `/contacts?ddi=55&phone=${encodeURIComponent(phone.replace(/^55/u, ""))}&limit=1000`,
    );
    const exact = this.unwrapList(response, "contacts").find((contact) => {
      const candidate = `${String(contact.ddi ?? "")}${String(contact.phone ?? "")}`.replace(/\D/gu, "");
      return candidate === phone;
    });
    return exact ? this.toContact(exact, "Contato Clint encontrado sem ID válido.") : null;
  }

  private async getContact(contactId: string): Promise<ClintContact | null> {
    const response = await this.request<Record<string, unknown>>(`/contacts/${contactId}`);
    const contact = this.unwrapObject(response, "contact");
    return Object.keys(contact).length > 0
      ? this.toContact(contact, "Contato Clint encontrado sem ID válido.")
      : null;
  }

  private async createContact(phone: string, name: string): Promise<ClintContact> {
    const response = await this.request<Record<string, unknown>>("/contacts", {
      method: "POST",
      body: JSON.stringify({
        name,
        ddi: "+55",
        phone: phone.replace(/^55/u, ""),
      }),
    });
    return this.toContact(
      this.unwrapObject(response, "contact"),
      "A Clint não retornou o ID do contato criado.",
    );
  }

  private async updateContactName(contactId: string, name: string): Promise<void> {
    this.validateUuid(contactId, "Contato Clint");
    await this.request(`/contacts/${contactId}`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  private toContact(contact: Record<string, unknown>, invalidIdMessage: string): ClintContact {
    return {
      id: this.readUuid(contact, "id", invalidIdMessage),
      name: typeof contact.name === "string" ? contact.name.trim() || null : null,
    };
  }

  private normalizeContactName(value: string | null | undefined): string | null {
    const name = value?.trim().replace(/\s+/gu, " ") ?? "";
    if (!name || /^\+?[\d\s().-]+$/u.test(name)) return null;
    return name.slice(0, 200);
  }

  private shouldReplaceContactName(currentName: string | null, phone: string): boolean {
    const current = currentName?.trim() ?? "";
    if (!current) return true;
    if (["lead whatsapp", "contato whatsapp"].includes(current.toLocaleLowerCase("pt-BR"))) {
      return true;
    }
    const currentDigits = current.replace(/\D/gu, "");
    const nationalPhone = phone.replace(/^55/u, "");
    return currentDigits.length >= 10 && (currentDigits === phone || currentDigits === nationalPhone);
  }

  private get allowedStageIds(): Set<string> {
    return new Set([
      this.stages.newLeadStageId,
      this.stages.qualifiedStageId,
      this.stages.interestedStageId,
      this.stages.negotiationStageId,
      this.stages.dataCollectedStageId,
      this.stages.handoffStageId,
    ]);
  }

  private validateStage(stageId: string): void {
    if (!this.allowedStageIds.has(stageId)) {
      throw new Error("Etapa Clint não pertence à configuração autorizada.");
    }
  }

  private normalizePhone(value: string): string {
    const phone = value.replace(/\D/gu, "");
    if (phone.length < 10 || phone.length > 15) throw new Error("Telefone inválido para a Clint.");
    return phone;
  }

  private validateUuid(value: string, label: string): void {
    if (!UUID_PATTERN.test(value)) throw new Error(`${label} inválido.`);
  }

  private validateFieldKey(value: string, label: string): void {
    if (!/^[a-z\d_-]+$/iu.test(value)) throw new Error(`${label} inválido.`);
  }

  private optionalUuid(value: unknown): string | null {
    return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
  }

  private readUuid(object: Record<string, unknown>, key: string, message: string): string {
    const value = this.optionalUuid(object[key]);
    if (!value) throw new Error(message);
    return value;
  }

  private unwrapObject(response: Record<string, unknown>, key: string): Record<string, unknown> {
    const nested = response[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) return nested as Record<string, unknown>;
    const data = response.data;
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
    return response;
  }

  private unwrapList(response: unknown, key: string): Array<Record<string, unknown>> {
    if (Array.isArray(response)) return response as Array<Record<string, unknown>>;
    if (!response || typeof response !== "object") return [];
    const object = response as Record<string, unknown>;
    for (const candidate of [object[key], object.data, object.items]) {
      if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
    }
    const data = object.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const nested = data as Record<string, unknown>;
      for (const candidate of [nested[key], nested.items]) {
        if (Array.isArray(candidate)) return candidate as Array<Record<string, unknown>>;
      }
    }
    return [];
  }

  private unwrapFields(response: unknown): Array<Record<string, unknown>> {
    if (!response || typeof response !== "object" || Array.isArray(response)) return [];
    const data = (response as Record<string, unknown>).data;
    if (!data || typeof data !== "object" || Array.isArray(data)) return [];
    const fields = (data as Record<string, unknown>).fields;
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) return [];

    const result: Array<Record<string, unknown>> = [];
    for (const [entity, values] of Object.entries(fields as Record<string, unknown>)) {
      if (!values || typeof values !== "object" || Array.isArray(values)) continue;
      for (const [id, field] of Object.entries(values as Record<string, unknown>)) {
        if (id === "groups" || !field || typeof field !== "object" || Array.isArray(field)) continue;
        result.push({ id, entity, ...(field as Record<string, unknown>) });
      }
    }
    return result;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        "api-token": this.apiToken,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Clint API retornou HTTP ${response.status}.`);
    return body as T;
  }
}
