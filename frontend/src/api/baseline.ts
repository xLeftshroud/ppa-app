import { apiFetch } from "./client";
import type { BaselineResponse } from "@/types/api";

export async function fetchBaseline(
  productSkuCode: number,
  customer: string
): Promise<BaselineResponse> {
  const params = new URLSearchParams({
    product_sku_code: String(productSkuCode),
    customer,
  });
  return apiFetch<BaselineResponse>(`/v1/baseline?${params}`);
}
