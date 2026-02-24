import { useQuery } from "@tanstack/react-query";
import { fetchSkus, fetchCustomers } from "@/api/catalog";

export function useSkus(datasetId: string | null) {
  return useQuery({
    queryKey: ["skus", datasetId],
    queryFn: () => fetchSkus(datasetId!),
    enabled: !!datasetId,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
    staleTime: Infinity,
  });
}
