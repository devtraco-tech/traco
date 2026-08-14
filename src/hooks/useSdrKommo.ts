import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdrRequest } from "@/hooks/useSdrWhatsapp";

export type KommoStageMapping = {
  newLead: number;
  qualified: number;
  interested: number;
  negotiation: number;
  dataCollected: number;
  awaitingHuman: number;
};

export type KommoConfigurationResponse = {
  configuration: null | {
    enabled: boolean;
    subdomain: string;
    stages: {
      pipelineId: number;
      newLeadStatusId: number;
      qualifiedStatusId: number;
      interestedStatusId: number;
      negotiationStatusId: number;
      dataCollectedStatusId: number;
      handoffStatusId: number;
    };
    handoff: {
      responsibleUserId: number;
      taskTypeId: number;
      deadlineMinutes: number;
    };
  };
  tokenConfigured: boolean;
};

export type KommoOptions = {
  pipelines: Array<{
    id: number;
    name: string;
    statuses: Array<{ id: number; name: string; sort: number }>;
  }>;
  users: Array<{ id: number; name: string; active: boolean }>;
  taskTypes: Array<{ id: number; name: string }>;
};

export type KommoPipeline = KommoOptions["pipelines"][number];
export type KommoPipelineProvisionResult = {
  pipeline: KommoPipeline;
  created: boolean;
};

export type SaveKommoConfiguration = {
  enabled: boolean;
  pipelineId: number;
  stages: KommoStageMapping;
  responsibleUserId: number;
  taskTypeId: number;
  deadlineMinutes: number;
};

const CONFIG_KEY = ["sdr", "kommo", "config"] as const;

export function useSdrKommo(enabled: boolean) {
  const queryClient = useQueryClient();
  const configuration = useQuery({
    queryKey: CONFIG_KEY,
    queryFn: () => sdrRequest<KommoConfigurationResponse>("/api/sdr/kommo/config"),
    enabled,
    retry: false,
  });
  const options = useQuery({
    queryKey: ["sdr", "kommo", "options"],
    queryFn: () => sdrRequest<KommoOptions>("/api/sdr/kommo/options"),
    enabled,
    retry: false,
  });
  const save = useMutation({
    mutationFn: (input: SaveKommoConfiguration) =>
      sdrRequest<KommoConfigurationResponse>("/api/sdr/kommo/config", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => queryClient.setQueryData(CONFIG_KEY, result),
  });
  const createStandardPipeline = useMutation({
    mutationFn: (name: string) => sdrRequest<KommoPipelineProvisionResult>(
      "/api/sdr/kommo/pipelines/standard",
      { method: "POST", body: JSON.stringify({ name }) },
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sdr", "kommo", "options"] }),
  });
  const renamePipeline = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: number; name: string }) =>
      sdrRequest<{ pipeline: KommoPipeline; previousName: string }>(
        `/api/sdr/kommo/pipelines/${pipelineId}`,
        { method: "PATCH", body: JSON.stringify({ name }) },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sdr", "kommo", "options"] }),
  });
  const renameStage = useMutation({
    mutationFn: ({ pipelineId, stageId, name }: {
      pipelineId: number;
      stageId: number;
      name: string;
    }) => sdrRequest<{ pipeline: KommoPipeline; previousName: string }>(
      `/api/sdr/kommo/pipelines/${pipelineId}/stages/${stageId}`,
      { method: "PATCH", body: JSON.stringify({ name }) },
    ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sdr", "kommo", "options"] }),
  });
  return {
    configuration: configuration.data,
    options: options.data,
    isLoading: configuration.isLoading || options.isLoading,
    error: configuration.error ?? options.error,
    refresh: async () => Promise.all([configuration.refetch(), options.refetch()]),
    refreshOptions: () => options.refetch(),
    save,
    createStandardPipeline,
    renamePipeline,
    renameStage,
  };
}
