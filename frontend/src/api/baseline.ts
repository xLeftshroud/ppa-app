import { apiFetch } from "./client";
import type { BaselineResponse } from "@/types/api";

export async function fetchBaseline(
  datasetId: string,
  productSkuCode: number,
  customer: string
): Promise<BaselineResponse> {
  const params = new URLSearchParams({
    dataset_id: datasetId,
    product_sku_code: String(productSkuCode),
    customer,
  });
  return apiFetch<BaselineResponse>(`/v1/baseline?${params}`);
}
