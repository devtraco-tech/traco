import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SdrWhatsappStatusName =
  | "MISSING"
  | "STOPPED"
  | "STARTING"
  | "SCAN_QR_CODE"
  | "PASSKEY_REQUIRED"
  | "PASSKEY_CONFIRMATION_REQUIRED"
  | "WORKING"
  | "FAILED"
  | "UNKNOWN";

export type SdrWhatsappStatus = {
  session: string;
  status: SdrWhatsappStatusName;
  connected: boolean;
  whatsappId: string | null;
  phoneE164: string | null;
  displayName: string | null;
};

type SdrWhatsappQr = {
  session: string;
  mimetype: string;
  data: string;
};

const SDR_API_URL = (import.meta.env.VITE_SDR_API_URL || "http://localhost:10000")
  .replace(/\/$/u, "");

export async function sdrRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente para continuar.");
  }

  let response: Response;
  try {
    response = await fetch(`${SDR_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("O backend do SDR está indisponível. Confirme se ele está em execução.");
  }

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(body.error || `O backend do SDR respondeu ${response.status}.`);
  }

  return body;
}

export function useSdrWhatsapp(enabled: boolean) {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: ["sdr", "whatsapp", "status"],
    queryFn: () => sdrRequest<SdrWhatsappStatus>("/api/sdr/whatsapp/status"),
    enabled,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === "WORKING" ? 10_000 : 3_000,
  });

  const shouldLoadQr = statusQuery.data?.status === "SCAN_QR_CODE";
  const qrQuery = useQuery({
    queryKey: ["sdr", "whatsapp", "qr"],
    queryFn: () => sdrRequest<SdrWhatsappQr>("/api/sdr/whatsapp/qr"),
    enabled: enabled && shouldLoadQr,
    retry: false,
    refetchInterval: shouldLoadQr ? 15_000 : false,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      sdrRequest<SdrWhatsappStatus>("/api/sdr/whatsapp/start", {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async (status) => {
      queryClient.setQueryData(["sdr", "whatsapp", "status"], status);
      await queryClient.invalidateQueries({ queryKey: ["sdr", "whatsapp"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () =>
      sdrRequest<SdrWhatsappStatus>("/api/sdr/whatsapp/disconnect", {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async (status) => {
      queryClient.setQueryData(["sdr", "whatsapp", "status"], status);
      queryClient.removeQueries({ queryKey: ["sdr", "whatsapp", "qr"] });
      await queryClient.invalidateQueries({ queryKey: ["sdr", "whatsapp", "status"] });
    },
  });

  return {
    status: statusQuery.data,
    qrDataUrl: qrQuery.data
      ? `data:${qrQuery.data.mimetype};base64,${qrQuery.data.data}`
      : null,
    isLoadingStatus: statusQuery.isLoading,
    statusError: statusQuery.error,
    qrError: qrQuery.error,
    isLoadingQr: qrQuery.isLoading || qrQuery.isFetching,
    start: startMutation,
    disconnect: disconnectMutation,
    refreshStatus: statusQuery.refetch,
    refreshQr: qrQuery.refetch,
  };
}
