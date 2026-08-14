import type {
  CatalogFilterOptions,
  CatalogFilters,
  CatalogInstructor,
  CatalogItem,
  CatalogProvider,
  CatalogResult,
} from "../domain/catalog.js";

export class CatalogApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "CatalogApiError";
  }
}

const nullableString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;
const nullableNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value
    : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

function instructor(value: unknown): CatalogInstructor | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  return {
    id: nullableString(row.id), name: nullableString(row.name),
    bio: nullableString(row.bio), photo_url: nullableString(row.photo_url),
  };
}

function mapItem(value: unknown): CatalogItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = nullableString(row.id);
  const title = nullableString(row.title);
  if (!id || !title) return null;
  const teachers = Array.isArray(row.teachers)
    ? row.teachers.map(instructor).filter((item): item is CatalogInstructor => Boolean(item))
    : instructor(row.teachers);
  return {
    id, title,
    slug: nullableString(row.slug), public_url: nullableString(row.public_url),
    description: nullableString(row.description), program: row.program ?? null,
    prerequisites: nullableString(row.prerequisites), differentials: nullableString(row.differentials),
    workload: nullableNumber(row.workload), duration: nullableString(row.duration),
    periodicity: nullableString(row.periodicity), language: nullableString(row.language),
    area: nullableString(row.area), modality: nullableString(row.modality),
    target_audience: nullableString(row.target_audience), teachers,
    other_professors: nullableString(row.other_professors),
    investment: nullableNumber(row.investment), currency: nullableString(row.currency),
    investment_details: nullableString(row.investment_details),
    installment_suggestion: nullableString(row.installment_suggestion),
    effective_installment: nullableString(row.effective_installment),
    vacancies: nullableNumber(row.vacancies), occupied_vacancies: nullableNumber(row.occupied_vacancies),
    available_vacancies: nullableNumber(row.available_vacancies),
    suggested_start_date: nullableString(row.suggested_start_date),
    effective_start_date: nullableString(row.effective_start_date),
    registration_deadline: nullableString(row.registration_deadline), end_date: nullableString(row.end_date),
    photo_1_url: nullableString(row.photo_1_url), photo_2_url: nullableString(row.photo_2_url),
    photo_3_url: nullableString(row.photo_3_url), photo_4_url: nullableString(row.photo_4_url),
    status: nullableString(row.status), display_status: nullableString(row.display_status),
  };
}

export class HttpCourseCatalogProvider implements CatalogProvider {
  private readonly cache = new Map<string, { expiresAt: number; value: CatalogResult }>();
  constructor(
    readonly id: string,
    readonly name: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly path: string,
    private readonly cacheTtlMs: number,
    private readonly timeoutMs: number,
  ) {}

  async list(filters: CatalogFilters = {}): Promise<CatalogResult> {
    const url = new URL(this.path, `${this.baseUrl.replace(/\/$/u, "")}/`);
    if (filters.area) url.searchParams.set("area", filters.area);
    if (filters.modality) url.searchParams.set("modality", filters.modality);
    if (filters.targetAudience) url.searchParams.set("target_audience", filters.targetAudience);
    if (filters.upcoming) url.searchParams.set("upcoming", "true");
    if (filters.includeFilters) url.searchParams.set("filters", "true");
    const key = url.toString();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { apikey: this.apiKey, Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      if (!response.ok || !body || body.success !== true) {
        throw new CatalogApiError(
          nullableString(body?.error) ?? `O catálogo respondeu ${response.status}`,
          response.status,
        );
      }
      if (!Array.isArray(body.data)) throw new CatalogApiError("Resposta inválida do catálogo");
      const result: CatalogResult = {
        items: body.data.map(mapItem).filter((item): item is CatalogItem => Boolean(item)),
        filters: body.filters && typeof body.filters === "object"
          ? body.filters as CatalogFilterOptions : null,
      };
      this.cache.set(key, { expiresAt: Date.now() + Math.min(this.cacheTtlMs, 60_000), value: result });
      return result;
    } catch (error) {
      if (error instanceof CatalogApiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new CatalogApiError("A consulta ao catálogo excedeu o tempo limite", 504);
      }
      throw new CatalogApiError("Não foi possível consultar o catálogo", 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}
