import { useQuery } from "@tanstack/react-query";
import { fetchSkus, fetchCustomers, fetchBrands, fetchFlavors, fetchPackTypes } from "@/api/catalog";

export function useSkus() {
  return useQuery({
    queryKey: ["skus"],
    queryFn: fetchSkus,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });
}

export function useFlavors() {
  return useQuery({
    queryKey: ["flavors"],
    queryFn: fetchFlavors,
  });
}

export function usePackTypes() {
  return useQuery({
    queryKey: ["packTypes"],
    queryFn: fetchPackTypes,
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
}
