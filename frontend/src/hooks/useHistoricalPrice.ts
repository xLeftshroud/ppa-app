import { useQuery } from "@tanstack/react-query";
import { fetchHistoricalPrice } from "@/api/historicalPrice";
import { ApiError } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";

export function useHistoricalPrice() {
  const selectedSku = useAppStore((s) => s.selectedSku);
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setHistoricalPrice = useAppStore((s) => s.setHistoricalPrice);

  const query = useQuery({
    queryKey: ["historicalPrice", selectedSku, selectedCustomer],
    queryFn: () => fetchHistoricalPrice(selectedSku!, selectedCustomer!),
    enabled: selectedSku != null && !!selectedCustomer,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.code === "HISTORICAL_PRICE_NOT_FOUND") return false;
      return failureCount < 3;
    },
  });

  const is404 = query.error instanceof ApiError && query.error.code === "HISTORICAL_PRICE_NOT_FOUND";

  useEffect(() => {
    if (query.data) {
      setHistoricalPrice(query.data);
    } else if (is404) {
      setHistoricalPrice(null);
    }
  }, [query.data, is404, setHistoricalPrice]);

  return { ...query, is404 };
}
