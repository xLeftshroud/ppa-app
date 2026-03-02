import { useQuery } from "@tanstack/react-query";
import { fetchBaseline } from "@/api/baseline";
import { ApiError } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";

export function useBaseline() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setBaseline = useAppStore((s) => s.setBaseline);

  const query = useQuery({
    queryKey: ["baseline", datasetId, selectedSku, selectedCustomer],
    queryFn: () => fetchBaseline(datasetId!, selectedSku!, selectedCustomer!),
    enabled: !!datasetId && selectedSku != null && !!selectedCustomer,
    retry: (failureCount, error) => {
      // Don't retry 404s — baseline simply doesn't exist
      if (error instanceof ApiError && error.code === "BASELINE_NOT_FOUND") return false;
      return failureCount < 3;
    },
  });

  const is404 = query.error instanceof ApiError && query.error.code === "BASELINE_NOT_FOUND";

  useEffect(() => {
    if (query.data) {
      setBaseline(query.data);
    } else if (is404) {
      setBaseline(null);
    }
  }, [query.data, is404, setBaseline]);

  return { ...query, is404 };
}
