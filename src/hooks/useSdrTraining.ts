import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdrRequest } from "@/hooks/useSdrWhatsapp";

export type SdrTrainingDocument = {
  id: string;
  documentType: "faq" | "pdf" | "audience_matrix" | "commercial_script" | "follow_up";
  title: string;
  content: string;
  sourceUrl: string | null;
  active: boolean;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type SdrTrainingConfiguration = {
  version: string;
  script: string;
  documents: SdrTrainingDocument[];
  readiness: {
    script: boolean;
    faq: boolean;
    audienceMatrix: boolean;
    followUps: boolean;
    followUpCadence: boolean;
    pdf: boolean;
    ready: boolean;
  };
};

const TRAINING_QUERY_KEY = ["sdr", "training"] as const;

export function useSdrTraining(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: TRAINING_QUERY_KEY,
    queryFn: () => sdrRequest<SdrTrainingConfiguration>("/api/sdr/training"),
    enabled,
    retry: false,
  });

  const updateCache = (configuration: SdrTrainingConfiguration) => {
    queryClient.setQueryData(TRAINING_QUERY_KEY, configuration);
  };

  const install = useMutation({
    mutationFn: () =>
      sdrRequest<SdrTrainingConfiguration>("/api/sdr/training/install", {
        method: "POST",
        body: "{}",
      }),
    onSuccess: updateCache,
  });

  const saveScript = useMutation({
    mutationFn: (script: string) =>
      sdrRequest<SdrTrainingConfiguration>("/api/sdr/training/script", {
        method: "PUT",
        body: JSON.stringify({ script }),
      }),
    onSuccess: updateCache,
  });

  return {
    configuration: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    install,
    saveScript,
  };
}
