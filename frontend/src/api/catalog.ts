import { apiFetch } from "./client";
import type { SkuListResponse } from "@/types/api";

export async function fetchSkus(): Promise<SkuListResponse> {
  return apiFetch<SkuListResponse>("/v1/catalog/skus");
}

export async function fetchCustomers(): Promise<string[]> {
  return apiFetch<string[]>("/v1/catalog/customers");
}

export async function fetchBrands(): Promise<string[]> {
  return apiFetch<string[]>("/v1/catalog/brands");
}

export async function fetchFlavors(): Promise<string[]> {
  return apiFetch<string[]>("/v1/catalog/flavors");
}

export async function fetchPackTypes(): Promise<string[]> {
  return apiFetch<string[]>("/v1/catalog/pack-types");
}
