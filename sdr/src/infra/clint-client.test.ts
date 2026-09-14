import { describe, expect, it, vi } from "vitest";
import {
  ClintClient,
  type ClintEnrollmentFieldConfiguration,
  type ClintStageConfiguration,
} from "./clint-client.js";

const ids = {
  origin: "10000000-0000-4000-8000-000000000001",
  newLead: "20000000-0000-4000-8000-000000000001",
  qualified: "20000000-0000-4000-8000-000000000002",
  interested: "20000000-0000-4000-8000-000000000003",
  negotiation: "20000000-0000-4000-8000-000000000004",
  dataCollected: "20000000-0000-4000-8000-000000000005",
  handoff: "20000000-0000-4000-8000-000000000006",
  deal: "30000000-0000-4000-8000-000000000001",
  contact: "40000000-0000-4000-8000-000000000001",
  user: "50000000-0000-4000-8000-000000000001",
  field: "60000000-0000-4000-8000-000000000001",
};

const stages: ClintStageConfiguration = {
  originId: ids.origin,
  newLeadStageId: ids.newLead,
  qualifiedStageId: ids.qualified,
  interestedStageId: ids.interested,
  negotiationStageId: ids.negotiation,
  dataCollectedStageId: ids.dataCollected,
  handoffStageId: ids.handoff,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("ClintClient", () => {
  it("reutiliza negócio aberto do mesmo telefone e origem", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: [{ id: ids.deal, contact_id: ids.contact }] }))
      .mockResolvedValueOnce(json({ data: { id: ids.contact, name: "Maria" } }));
    const client = new ClintClient("token", stages, fetcher);

    const result = await client.ensureDeal({
      name: "Maria",
      contactName: "Maria",
      phoneE164: "+5562999999999",
      courseTitle: "Implantodontia",
      stageId: ids.newLead,
    });

    expect(result).toEqual({ dealId: ids.deal, contactId: ids.contact, merged: true });
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(`origin_id=${encodeURIComponent(ids.origin)}`);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ "api-token": "token" });
  });

  it("corrige o nome do contato ligado a um negócio aberto", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: [{ id: ids.deal, contact_id: ids.contact }] }))
      .mockResolvedValueOnce(json({
        data: { id: ids.contact, name: "+55 (62) 99999-9999" },
      }))
      .mockResolvedValueOnce(json({ data: { id: ids.contact } }));
    const client = new ClintClient("token", stages, fetcher);

    const result = await client.ensureDeal({
      name: "Maria",
      contactName: "Maria",
      phoneE164: "+5562999999999",
      courseTitle: "Implantodontia",
      stageId: ids.newLead,
    });

    expect(result).toEqual({ dealId: ids.deal, contactId: ids.contact, merged: true });
    expect(String(fetcher.mock.calls[2]?.[0])).toBe(
      `https://api.clint.digital/v1/contacts/${ids.contact}`,
    );
    expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))).toEqual({ name: "Maria" });
  });

  it("cria negócio ligado a um contato existente", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: [] }))
      .mockResolvedValueOnce(json({
        data: [{ id: ids.contact, ddi: "55", phone: "62999999999", name: "Maria" }],
      }))
      .mockResolvedValueOnce(json({ data: { id: ids.deal, contact_id: ids.contact } }, 201));
    const client = new ClintClient("token", stages, fetcher);

    const result = await client.ensureDeal({
      name: "Maria",
      contactName: "Maria",
      phoneE164: "+5562999999999",
      courseTitle: "Implantodontia",
      stageId: ids.newLead,
    });

    expect(result).toEqual({ dealId: ids.deal, contactId: ids.contact, merged: false });
    const body = JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body));
    expect(body).toMatchObject({
      origin_id: ids.origin,
      stage_id: ids.newLead,
      contact_id: ids.contact,
    });
  });

  it("cria explicitamente o contato com o nome do WhatsApp", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: [] }))
      .mockResolvedValueOnce(json({ data: [] }))
      .mockResolvedValueOnce(json({ data: { id: ids.contact, name: "Maria" } }, 201))
      .mockResolvedValueOnce(json({ data: { id: ids.deal, contact_id: ids.contact } }, 201));
    const client = new ClintClient("token", stages, fetcher);

    await client.ensureDeal({
      name: "Maria",
      contactName: "Maria",
      phoneE164: "+5562999999999",
      courseTitle: "Implantodontia",
      stageId: ids.newLead,
    });

    expect(String(fetcher.mock.calls[2]?.[0])).toBe("https://api.clint.digital/v1/contacts");
    expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))).toEqual({
      name: "Maria",
      ddi: "+55",
      phone: "62999999999",
    });
    expect(JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body))).toMatchObject({
      contact_id: ids.contact,
    });
  });

  it.each([null, "5562999999999", "+55 (62) 99999-9999", "Lead WhatsApp"])(
    "preenche nome substituível do contato existente: %s",
    async (currentName) => {
      const fetcher = vi.fn<typeof fetch>()
        .mockResolvedValueOnce(json({ data: [] }))
        .mockResolvedValueOnce(json({
          data: [{ id: ids.contact, ddi: "55", phone: "62999999999", name: currentName }],
        }))
        .mockResolvedValueOnce(json({ data: { id: ids.contact } }))
        .mockResolvedValueOnce(json({ data: { id: ids.deal, contact_id: ids.contact } }, 201));
      const client = new ClintClient("token", stages, fetcher);

      await client.ensureDeal({
        name: "Maria",
        contactName: "Maria",
        phoneE164: "+5562999999999",
        courseTitle: "Implantodontia",
        stageId: ids.newLead,
      });

      expect(String(fetcher.mock.calls[2]?.[0])).toBe(
        `https://api.clint.digital/v1/contacts/${ids.contact}`,
      );
      expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))).toEqual({ name: "Maria" });
    },
  );

  it("preserva nome manual do contato existente", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ data: [] }))
      .mockResolvedValueOnce(json({
        data: [{ id: ids.contact, ddi: "55", phone: "62999999999", name: "Maria da Silva" }],
      }))
      .mockResolvedValueOnce(json({ data: { id: ids.deal, contact_id: ids.contact } }, 201));
    const client = new ClintClient("token", stages, fetcher);

    await client.ensureDeal({
      name: "Maria WhatsApp",
      contactName: "Maria WhatsApp",
      phoneE164: "+5562999999999",
      courseTitle: "Implantodontia",
      stageId: ids.newLead,
    });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(JSON.parse(String(fetcher.mock.calls[2]?.[1]?.body))).toMatchObject({
      contact_id: ids.contact,
    });
  });

  it("move o negócio somente para uma etapa autorizada", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ data: { id: ids.deal } }));
    const client = new ClintClient("token", stages, fetcher);

    await client.updateDealStage(ids.deal, ids.interested);

    expect(fetcher).toHaveBeenCalledWith(
      `https://api.clint.digital/v1/deals/${ids.deal}`,
      expect.objectContaining({ method: "POST" }),
    );
    await expect(client.updateDealStage(ids.deal, ids.user)).rejects.toThrow(/não pertence/u);
  });

  it("atualiza campos de matrícula e atribui o responsável", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ data: { id: ids.deal } }));
    const client = new ClintClient("token", stages, fetcher);
    const fields = Object.fromEntries([
      "cpf", "birth_date", "marital_status", "nationality",
      "birthplace", "cro", "address", "district", "postal_code",
    ].map((name, index) => [
      name,
      `60000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    ])) as ClintEnrollmentFieldConfiguration;

    await client.updateEnrollmentFields(ids.deal, {
      full_name: "Maria",
      whatsapp_phone: "5562999999999",
      email: "maria@example.com",
      cpf: "12345678901",
    }, fields);
    await client.prepareHumanHandoff(ids.deal, {
      responsibleUserId: ids.user,
      noteFieldId: "observacao_sdr",
      noteText: "Atendimento humano solicitado",
    });

    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      email: "maria@example.com",
      fields: { [fields.cpf]: "12345678901" },
    });
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      user_id: ids.user,
      fields: { observacao_sdr: "Atendimento humano solicitado" },
    });
  });

  it("normaliza os campos agrupados retornados pela API atual", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({
      data: {
        fields: {
          DEAL: {
            groups: {},
            cpf: { label: "CPF", type: "TEXT" },
          },
          CONTACT: {
            groups: {},
            curso: { label: "Curso", type: "TEXT" },
          },
        },
      },
    }));
    const client = new ClintClient("token", stages, fetcher);

    await expect(client.listFields()).resolves.toEqual([
      { id: "cpf", entity: "DEAL", label: "CPF", type: "TEXT" },
      { id: "curso", entity: "CONTACT", label: "Curso", type: "TEXT" },
    ]);
  });
});
