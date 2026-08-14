import { describe, expect, it, vi } from "vitest";
import { KommoClient, type KommoStageConfiguration } from "./kommo-client.js";

const stages: KommoStageConfiguration = {
  pipelineId: 100,
  newLeadStatusId: 201,
  qualifiedStatusId: 202,
  interestedStatusId: 204,
  negotiationStatusId: 203,
  handoffStatusId: 205,
  dataCollectedStatusId: 206,
};

describe("KommoClient", () => {
  it("cria o funil padrão e suas seis colunas", async () => {
    const defaultPipeline = {
      _embedded: {
        pipelines: [{
          id: 100,
          name: "Atendimento SDR",
          _embedded: { statuses: [{ id: 201, name: "Etapa inicial", sort: 10, type: 0 }] },
        }],
      },
    };
    const completedPipeline = {
      _embedded: {
        pipelines: [{
          id: 100,
          name: "Atendimento SDR",
          _embedded: {
            statuses: [
              { id: 201, name: "Novo Lead", sort: 10, type: 0 },
              { id: 202, name: "Qualificado", sort: 20, type: 0 },
              { id: 203, name: "Interessado", sort: 30, type: 0 },
              { id: 204, name: "Em Negociação", sort: 40, type: 0 },
              { id: 205, name: "Dados Coletados", sort: 50, type: 0 },
              { id: 206, name: "Aguardando Humano", sort: 60, type: 0 },
            ],
          },
        }],
      },
    };
    const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ _embedded: { pipelines: [] } }))
      .mockResolvedValueOnce(response({ _embedded: { pipelines: [{ id: 100 }] } }))
      .mockResolvedValueOnce(response(defaultPipeline))
      .mockResolvedValueOnce(response(defaultPipeline))
      .mockResolvedValueOnce(response({ id: 201, name: "Novo Lead" }))
      .mockResolvedValueOnce(response({ _embedded: { statuses: [] } }))
      .mockResolvedValueOnce(response(completedPipeline));
    const client = new KommoClient("teste", "token", null, fetcher);

    const result = await client.createStandardPipeline("Atendimento SDR");

    expect(result.created).toBe(true);
    expect(result.pipeline.statuses).toHaveLength(6);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://teste.kommo.com/api/v4/leads/pipelines",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      5,
      "https://teste.kommo.com/api/v4/leads/pipelines/100/statuses/201",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("não duplica um funil padrão que já existe", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      _embedded: { pipelines: [{ id: 100, name: "Atendimento SDR", _embedded: { statuses: [] } }] },
    }), { status: 200 }));
    const client = new KommoClient("teste", "token", null, fetcher);

    const result = await client.createStandardPipeline(" Atendimento SDR ");

    expect(result).toMatchObject({ created: false, pipeline: { id: 100 } });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("renomeia somente uma coluna editável do funil informado", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: {
          pipelines: [{
            id: 100,
            name: "Atendimento SDR",
            _embedded: { statuses: [{ id: 201, name: "Novo Lead", sort: 10, type: 0 }] },
          }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 201,
        name: "Primeiro contato",
      }), { status: 200 }));
    const client = new KommoClient("teste", "token", null, fetcher);

    const result = await client.renamePipelineStage(100, 201, "Primeiro contato");

    expect(result.previousName).toBe("Novo Lead");
    expect(result.pipeline.statuses[0]?.name).toBe("Primeiro contato");
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://teste.kommo.com/api/v4/leads/pipelines/100/statuses/201",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("recusa enviar lead para uma etapa fora da configuração", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const client = new KommoClient("teste", "token", stages, fetcher);

    await expect(client.createLead({
      name: "Lead de teste",
      phoneE164: "+5562999999999",
      courseTitle: "Curso",
      conversationId: "conversation-1",
      statusId: 999,
    })).rejects.toThrow(/não pertence/u);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("cria lead e contato somente no funil configurado", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      _embedded: { leads: [{ id: 300, contact_id: 400, merged: false }] },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new KommoClient("teste", "token", stages, fetcher);

    const result = await client.createLead({
      name: "[TESTE SDR] Lead",
      phoneE164: "+5562999999999",
      courseTitle: "Curso",
      conversationId: "conversation-1",
      statusId: stages.newLeadStatusId,
    });

    expect(result).toEqual({ leadId: 300, contactId: 400, merged: false });
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body[0]).toMatchObject({
      pipeline_id: stages.pipelineId,
      status_id: stages.newLeadStatusId,
      request_id: "conversation-1",
    });
  });

  it("reutiliza o card do mesmo telefone no funil configurado", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: {
          contacts: [{
            id: 400,
            custom_fields_values: [{
              field_code: "PHONE",
              values: [{ value: "+55 (62) 99999-9999" }],
            }],
            _embedded: { leads: [{ id: 300 }] },
          }],
        },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        id: 300,
        pipeline_id: stages.pipelineId,
      }), { status: 200 }));
    const client = new KommoClient("teste", "token", stages, fetcher);

    const result = await client.ensureLead({
      name: "Lead existente",
      phoneE164: "+5562999999999",
      courseTitle: "Curso",
      conversationId: "conversation-2",
      statusId: stages.newLeadStatusId,
    });

    expect(result).toEqual({ leadId: 300, contactId: 400, merged: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("/contacts?query=5562999999999");
  });

  it("grava os dados coletados nos campos personalizados do card", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: 300 }), { status: 200 }),
    );
    const client = new KommoClient("teste", "token", stages, fetcher);
    const fields = {
      full_name: 301, whatsapp_phone: 302, cpf: 303, birth_date: 304,
      marital_status: 305, nationality: 306, birthplace: 307, cro: 308,
      email: 309, address: 310, district: 311, postal_code: 312,
    };

    await client.updateEnrollmentFields(300, {
      full_name: "Maria Teste",
      cpf: "12345678901",
      email: "maria@example.com",
    }, fields);

    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.custom_fields_values).toEqual([
      { field_id: 301, values: [{ value: "Maria Teste" }] },
      { field_id: 303, values: [{ value: "12345678901" }] },
      { field_id: 309, values: [{ value: "maria@example.com" }] },
    ]);
  });

  it("move somente o lead e a etapa autorizados", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      id: 300,
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new KommoClient("teste", "token", stages, fetcher);

    await client.updateLeadStage(300, stages.interestedStatusId);

    expect(fetcher).toHaveBeenCalledWith(
      "https://teste.kommo.com/api/v4/leads/300",
      expect.objectContaining({ method: "PATCH" }),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      pipeline_id: stages.pipelineId,
      status_id: stages.interestedStatusId,
    });
  });

  it("atribui responsável, cria tarefa e registra nota no handoff", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 300 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: { tasks: [{ id: 700 }] },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        _embedded: { notes: [{ id: 800 }] },
      }), { status: 200 }));
    const client = new KommoClient("teste", "token", stages, fetcher);

    await client.prepareHumanHandoff(300, {
      responsibleUserId: 501,
      taskTypeId: 1,
      deadlineMinutes: 5,
      taskText: "Assumir atendimento do SDR",
      noteText: "Nome: Lead Teste\nTelefone: +5562999999999",
      requestId: "handoff-conversation-1",
    });

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://teste.kommo.com/api/v4/leads/300",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      responsible_user_id: 501,
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://teste.kommo.com/api/v4/tasks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))[0]).toMatchObject({
      task_type_id: 1,
      entity_id: 300,
      entity_type: "leads",
      responsible_user_id: 501,
      text: "Assumir atendimento do SDR",
    });
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "https://teste.kommo.com/api/v4/leads/notes",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
