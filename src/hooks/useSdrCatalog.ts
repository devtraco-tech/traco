import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdrRequest } from "./useSdrWhatsapp";

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
  registration_deadline: string | null;
  effective_start_date: string | null;
  vacancies: number | null;
  available_vacancies: number | null;
};

export type CatalogBinding = {
  itemId: string;
  slug: string | null;
  snapshot: CatalogItem;
  syncedAt: string;
};

type CatalogFilters = {
  areas: string[];
  modalities: Array<{ value: string; label: string }>;
  targetAudiences: Array<{ value: string; label: string }>;
};

export function useSdrCatalog(
  enabled: boolean,
  selected: { area: string; modality: string; audience: string },
) {
  const queryClient = useQueryClient();
  const params = new URLSearchParams({ filters: "true" });
  if (selected.area) params.set("area", selected.area);
  if (selected.modality) params.set("modality", selected.modality);
  if (selected.audience) params.set("target_audience", selected.audience);

  const items = useQuery({
    queryKey: ["sdr", "catalog", "items", selected],
    enabled,
    retry: false,
    queryFn: () => sdrRequest<{ items: CatalogItem[]; filters: CatalogFilters | null }>(
      `/api/sdr/catalog/items?${params}`,
    ),
  });
  const binding = useQuery({
    queryKey: ["sdr", "catalog", "binding"],
    enabled,
    retry: false,
    queryFn: () => sdrRequest<{ binding: CatalogBinding | null }>("/api/sdr/catalog/binding"),
  });
  const bind = useMutation({
    mutationFn: (itemId: string) => sdrRequest<{ binding: CatalogBinding }>(
      "/api/sdr/catalog/binding",
      { method: "POST", body: JSON.stringify({ itemId }) },
    ),
    onSuccess: (result) => queryClient.setQueryData(["sdr", "catalog", "binding"], result),
  });

  return { items, binding, bind };
}
