import { useQuery } from "@tanstack/react-query";
import { fetchSkus, fetchCustomers, fetchBrands, fetchFlavors, fetchPackTypes } from "@/api/catalog";

export function useSkus(datasetId: string | null) {
  return useQuery({
    queryKey: ["skus", datasetId],
    queryFn: () => fetchSkus(datasetId!),
    enabled: !!datasetId,
  });
}

export function useBrands(datasetId: string | null) {
  return useQuery({
    queryKey: ["brands", datasetId],
    queryFn: () => fetchBrands(datasetId!),
    enabled: !!datasetId,
  });
}

export function useFlavors(datasetId: string | null) {
  return useQuery({
    queryKey: ["flavors", datasetId],
    queryFn: () => fetchFlavors(datasetId!),
    enabled: !!datasetId,
  });
}

export function usePackTypes(datasetId: string | null) {
  return useQuery({
    queryKey: ["packTypes", datasetId],
    queryFn: () => fetchPackTypes(datasetId!),
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
