export type WahaSendResult = {
  providerMessageId?: string;
};

export type WahaSessionStatus =
  | "MISSING"
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "PASSKEY_REQUIRED"
  | "PASSKEY_CONFIRMATION_REQUIRED"
  | "WORKING"
  | "FAILED"
  | "UNKNOWN";

export type WahaSessionInfo = {
  session: string;
  status: WahaSessionStatus;
  connected: boolean;
  whatsappId: string | null;
  phoneE164: string | null;
  displayName: string | null;
};

export type WahaQrCode = {
  mimetype: string;
  data: string;
};

export class WahaApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "WahaApiError";
  }
}

export class WahaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly session: string,
  ) {}

  async getSession(): Promise<WahaSessionInfo> {
    const response = await this.request(`/api/sessions/${encodeURIComponent(this.session)}`, {
      method: "GET",
    }, [404]);

    if (response.status === 404) {
      return this.missingSession();
    }

    return this.toSessionInfo(await readJsonObject(response));
  }

  async ensureSession(): Promise<WahaSessionInfo> {
    const current = await this.getSession();

    if (current.status === "MISSING") {
      const response = await this.request("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ name: this.session, start: true }),
      });
      return this.toSessionInfo(await readJsonObject(response));
    }

    if (current.status === "STOPPED") {
      const response = await this.request(
        `/api/sessions/${encodeURIComponent(this.session)}/start`,
        { method: "POST", body: "{}" },
      );
      return this.toSessionInfo(await readJsonObject(response));
    }

    if (current.status === "FAILED") {
      const response = await this.request(
        `/api/sessions/${encodeURIComponent(this.session)}/restart`,
        { method: "POST", body: "{}" },
      );
      return this.toSessionInfo(await readJsonObject(response));
    }

    return current;
  }

  async getQrCode(): Promise<WahaQrCode> {
    const response = await this.request(
      `/api/${encodeURIComponent(this.session)}/auth/qr?format=image`,
      { method: "GET", headers: { Accept: "application/json" } },
    );
    const body = await readJsonObject(response);
    const mimetype = typeof body.mimetype === "string" ? body.mimetype : "image/png";
    const data = typeof body.data === "string" ? body.data : null;

    if (!data || !mimetype.startsWith("image/")) {
      throw new WahaApiError("WAHA retornou um QR Code inválido", 502, body);
    }

    return { mimetype, data };
  }

  async resolveLid(lid: string): Promise<string | null> {
    if (!lid.endsWith("@lid")) return lid.endsWith("@c.us") ? lid : null;

    const response = await this.request(
      `/api/${encodeURIComponent(this.session)}/lids/${encodeURIComponent(lid)}`,
      { method: "GET" },
      [404],
    );
    if (response.status === 404) return null;

    const body = await readJsonObject(response);
    return typeof body.pn === "string" && body.pn.endsWith("@c.us")
      ? body.pn
      : null;
  }

  async logout(): Promise<WahaSessionInfo> {
    const current = await this.getSession();
    if (current.status === "MISSING") return current;

    const response = await this.request(
      `/api/sessions/${encodeURIComponent(this.session)}/logout`,
      { method: "POST", body: "{}" },
    );
    return this.toSessionInfo(await readJsonObject(response));
  }

  async sendText(chatId: string, text: string): Promise<WahaSendResult> {
    const response = await this.request("/api/sendText", {
      method: "POST",
      body: JSON.stringify({
        session: this.session,
        chatId,
        text,
      }),
    });

    const body = await readJsonObject(response);

    const nestedId =
      typeof body.id === "object" && body.id
        ? (body.id as Record<string, unknown>)._serialized
        : undefined;

    const providerMessageId =
      typeof body.id === "string"
        ? body.id
        : typeof nestedId === "string"
          ? nestedId
          : undefined;

    return providerMessageId ? { providerMessageId } : {};
  }

  private async request(
    path: string,
    init: RequestInit,
    allowedErrorStatuses: number[] = [],
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.baseUrl), {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
          ...init.headers,
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new WahaApiError(`Não foi possível acessar o WAHA: ${details}`, 503);
    }

    if (!response.ok && !allowedErrorStatuses.includes(response.status)) {
      const body = await response.json().catch(() => ({}));
      throw new WahaApiError(
        `WAHA respondeu ${response.status}`,
        response.status,
        body,
      );
    }

    return response;
  }

  private toSessionInfo(body: Record<string, unknown>): WahaSessionInfo {
    const rawStatus = typeof body.status === "string" ? body.status.toUpperCase() : "UNKNOWN";
    const knownStatuses: WahaSessionStatus[] = [
      "STOPPED",
      "STARTING",
      "SCAN_QR_CODE",
      "PASSKEY_REQUIRED",
      "PASSKEY_CONFIRMATION_REQUIRED",
      "WORKING",
      "FAILED",
    ];
    const status = knownStatuses.includes(rawStatus as WahaSessionStatus)
      ? (rawStatus as WahaSessionStatus)
      : "UNKNOWN";
    const me = body.me && typeof body.me === "object"
      ? (body.me as Record<string, unknown>)
      : null;
    const whatsappId = me && typeof me.id === "string" ? me.id : null;

    return {
      session: typeof body.name === "string" ? body.name : this.session,
      status,
      connected: status === "WORKING",
      whatsappId,
      phoneE164: whatsappId ? whatsappId.replace(/@.+$/u, "") : null,
      displayName: me && typeof me.pushName === "string" ? me.pushName : null,
    };
  }

  private missingSession(): WahaSessionInfo {
    return {
      session: this.session,
      status: "MISSING",
      connected: false,
      whatsappId: null,
      phoneE164: null,
      displayName: null,
    };
  }
}

async function readJsonObject(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}
