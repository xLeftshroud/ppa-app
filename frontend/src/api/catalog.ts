import { apiFetch } from "./client";
import type { SkuListResponse, SkuLookupRequest } from "@/types/api";

export async function fetchSkus(datasetId: string): Promise<SkuListResponse> {
  return apiFetch<SkuListResponse>(`/v1/catalog/skus?dataset_id=${encodeURIComponent(datasetId)}`);
}

export async function fetchCustomers(): Promise<string[]> {
  return apiFetch<string[]>("/v1/catalog/customers");
}

export async function lookupSku(body: SkuLookupRequest): Promise<SkuListResponse> {
  return apiFetch<SkuListResponse>("/v1/catalog/sku-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
