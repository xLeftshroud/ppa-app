import { apiFetch } from "./client";
import type { SkuListResponse } from "@/types/api";

export async function fetchSkus(datasetId: string): Promise<SkuListResponse> {
  return apiFetch<SkuListResponse>(`/v1/catalog/skus?dataset_id=${encodeURIComponent(datasetId)}`);
}

export async function fetchCustomers(datasetId: string): Promise<string[]> {
  return apiFetch<string[]>(`/v1/catalog/customers?dataset_id=${encodeURIComponent(datasetId)}`);
}

export async function fetchBrands(datasetId: string): Promise<string[]> {
  return apiFetch<string[]>(`/v1/catalog/brands?dataset_id=${encodeURIComponent(datasetId)}`);
}

export async function fetchFlavors(datasetId: string): Promise<string[]> {
  return apiFetch<string[]>(`/v1/catalog/flavors?dataset_id=${encodeURIComponent(datasetId)}`);
}

export async function fetchPackTypes(datasetId: string): Promise<string[]> {
  return apiFetch<string[]>(`/v1/catalog/pack-types?dataset_id=${encodeURIComponent(datasetId)}`);
}
