import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogApiError, HttpCourseCatalogProvider } from "./catalog-client.js";

afterEach(() => vi.unstubAllGlobals());

function createProvider() {
  return new HttpCourseCatalogProvider(
    "test-catalog",
    "Catálogo de teste",
    "https://catalog.example.com",
    "catalog-secret",
    "/functions/v1/courses",
    60_000,
    5_000,
  );
}

describe("HttpCourseCatalogProvider", () => {
  it("repassa filtros e autenticação, tolera campos nulos e usa cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: [{ id: "course-1", title: "Implantodontia", investment: null }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = createProvider();
    const filters = {
      area: "Implantodontia",
      modality: "presencial",
      targetAudience: "cirurgioes_dentistas",
    };

    const first = await provider.list(filters);
    const second = await provider.list(filters);

    expect(first.items[0]).toMatchObject({ id: "course-1", investment: null });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("area=Implantodontia");
    expect(String(url)).toContain("target_audience=cirurgioes_dentistas");
    expect(init.headers).toEqual({
      apikey: "catalog-secret",
      Authorization: "Bearer catalog-secret",
    });
  });

  it("trata success:false como erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: false, error: "indisponível" }), { status: 200 },
    )));

    await expect(createProvider().list()).rejects.toBeInstanceOf(CatalogApiError);
  });
});
