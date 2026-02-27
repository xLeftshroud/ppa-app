import { apiFetch } from "./client";
import type { PriceRange } from "@/types/api";

export function fetchPriceRange(sku: number): Promise<PriceRange> {
  return apiFetch<PriceRange>(`/v1/skus/${sku}/price-range`);
}
