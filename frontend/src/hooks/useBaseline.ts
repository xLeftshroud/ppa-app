import { useQuery } from "@tanstack/react-query";
import { fetchBaseline } from "@/api/baseline";
import { ApiError } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";

export function useBaseline() {
  const selectedSku = useAppStore((s) => s.selectedSku);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setHistoricalBaseline = useAppStore((s) => s.setHistoricalBaseline);

  const query = useQuery({
    queryKey: ["baseline", selectedSku, selectedCustomer],
    queryFn: () => fetchBaseline(selectedSku!, selectedCustomer!),
    enabled: selectedSku != null && !!selectedCustomer,
    retry: (failureCount, error) => {
      // Don't retry 404s — baseline simply doesn't exist
      if (error instanceof ApiError && error.code === "BASELINE_NOT_FOUND") return false;
      return failureCount < 3;
    },
  });

  const is404 = query.error instanceof ApiError && query.error.code === "BASELINE_NOT_FOUND";

  useEffect(() => {
    if (query.data) {
      setHistoricalBaseline(query.data);
    } else if (is404) {
      setHistoricalBaseline(null);
    }
  }, [query.data, is404, setHistoricalBaseline]);

  return { ...query, is404 };
}
