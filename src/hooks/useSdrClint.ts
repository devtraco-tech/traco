import { useQuery } from "@tanstack/react-query";
import { sdrRequest } from "@/hooks/useSdrWhatsapp";

export type SdrClintStatus = {
  configured: boolean;
  connected: boolean;
  originId: string | null;
  responsibleUserId: string | null;
};

export function useSdrClint(enabled: boolean) {
  const status = useQuery({
    queryKey: ["sdr", "clint", "status"],
    queryFn: () => sdrRequest<SdrClintStatus>("/api/sdr/clint/status"),
    enabled,
    retry: false,
  });

  return {
    status: status.data,
    isLoading: status.isLoading,
    error: status.error,
    refresh: status.refetch,
  };
}
