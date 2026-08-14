export type CatalogInstructor = {
  id: string | null;
  name: string | null;
  bio: string | null;
  photo_url: string | null;
};

export type CatalogItem = {
  id: string;
  title: string;
  slug: string | null;
  public_url: string | null;
  description: string | null;
  program: unknown;
  prerequisites: string | null;
  differentials: string | null;
  workload: number | null;
  duration: string | null;
  periodicity: string | null;
  language: string | null;
  area: string | null;
  modality: string | null;
  target_audience: string | null;
  teachers: CatalogInstructor | CatalogInstructor[] | null;
  other_professors: string | null;
  investment: number | null;
  investment_details: string | null;
  currency: string | null;
  installment_suggestion: string | null;
  effective_installment: string | null;
  vacancies: number | null;
  occupied_vacancies: number | null;
  available_vacancies: number | null;
  suggested_start_date: string | null;
  effective_start_date: string | null;
  registration_deadline: string | null;
  end_date: string | null;
  photo_1_url: string | null;
  photo_2_url: string | null;
  photo_3_url: string | null;
  photo_4_url: string | null;
  status: string | null;
  display_status: string | null;
};

export type CatalogItemSnapshot = Pick<CatalogItem,
  | "id" | "title" | "slug" | "area" | "investment" | "investment_details"
  | "currency" | "teachers" | "program" | "workload" | "vacancies"
  | "public_url" | "description" | "prerequisites" | "differentials"
  | "modality" | "available_vacancies" | "duration" | "periodicity"
  | "target_audience" | "other_professors" | "installment_suggestion"
  | "effective_installment" | "suggested_start_date" | "effective_start_date"
  | "registration_deadline" | "end_date"
>;

export type CatalogFilters = {
  area?: string;
  modality?: string;
  targetAudience?: string;
  upcoming?: boolean;
  includeFilters?: boolean;
};

export type CatalogFilterOptions = {
  areas: string[];
  modalities: Array<{ value: string; label: string }>;
  targetAudiences: Array<{ value: string; label: string }>;
};

export type CatalogResult = {
  items: CatalogItem[];
  filters: CatalogFilterOptions | null;
};

export type CatalogBinding = {
  itemId: string;
  slug: string | null;
  snapshot: CatalogItemSnapshot;
  syncedAt: string;
};

export interface CatalogProvider {
  readonly id: string;
  readonly name: string;
  list(filters?: CatalogFilters): Promise<CatalogResult>;
}

export function createCatalogItemSnapshot(item: CatalogItem): CatalogItemSnapshot {
  const {
    id, title, slug, area, investment, investment_details, currency, teachers,
    program, workload, vacancies, public_url, description, prerequisites,
    differentials, modality, available_vacancies, duration, periodicity,
    target_audience, other_professors, installment_suggestion,
    effective_installment, suggested_start_date, effective_start_date,
    registration_deadline, end_date,
  } = item;
  return {
    id, title, slug, area, investment, investment_details, currency, teachers,
    program, workload, vacancies, public_url, description, prerequisites,
    differentials, modality, available_vacancies, duration, periodicity,
    target_audience, other_professors, installment_suggestion,
    effective_installment, suggested_start_date, effective_start_date,
    registration_deadline, end_date,
  };
}
