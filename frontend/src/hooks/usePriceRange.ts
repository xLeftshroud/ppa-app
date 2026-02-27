import { useQuery } from "@tanstack/react-query";
import { fetchPriceRange } from "@/api/priceRange";

export function usePriceRange(sku: number | null) {
  return useQuery({
    queryKey: ["price-range", sku],
    queryFn: () => fetchPriceRange(sku!),
    enabled: sku != null,
    staleTime: Infinity,
  });
}
