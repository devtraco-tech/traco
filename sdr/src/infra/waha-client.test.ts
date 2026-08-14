import { afterEach, describe, expect, it, vi } from "vitest";
import { WahaClient } from "./waha-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WahaClient", () => {
  it("cria e inicia a sessão quando ela ainda não existe", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 404 }))
      .mockResolvedValueOnce(
        Response.json({ name: "default", status: "STARTING", me: null }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new WahaClient("http://localhost:3000", "secret", "default");

    const result = await client.ensureSession();

    expect(result.status).toBe("STARTING");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      "http://localhost:3000/api/sessions",
    );
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ name: "default", start: true }),
    });
  });

  it("normaliza a conta conectada sem expor dados extras do WAHA", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          name: "default",
          status: "WORKING",
          me: { id: "556299999999@c.us", pushName: "Atendimento ABO" },
          config: { private: "ignored" },
        }),
      ),
    );
    const client = new WahaClient("http://localhost:3000", "secret", "default");

    await expect(client.getSession()).resolves.toEqual({
      session: "default",
      status: "WORKING",
      connected: true,
      whatsappId: "556299999999@c.us",
      phoneE164: "556299999999",
      displayName: "Atendimento ABO",
    });
  });

  it("obtém o QR Code como imagem base64", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ mimetype: "image/png", data: "base64-qr" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new WahaClient("http://localhost:3000", "secret", "default");

    await expect(client.getQrCode()).resolves.toEqual({
      mimetype: "image/png",
      data: "base64-qr",
    });
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "http://localhost:3000/api/default/auth/qr?format=image",
    );
  });

  it("resolve um identificador LID para o telefone do contato", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        lid: "120000000000000@lid",
        pn: "5562999998888@c.us",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new WahaClient("http://localhost:3000", "secret", "default");

    await expect(client.resolveLid("120000000000000@lid")).resolves.toBe(
      "5562999998888@c.us",
    );
    expect(fetchMock.mock.calls[0]?.[0].toString()).toBe(
      "http://localhost:3000/api/default/lids/120000000000000%40lid",
    );
  });
});
