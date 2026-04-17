import { apiFetch } from "./client";
import type { HistoricalPriceResponse } from "@/types/api";

export async function fetchHistoricalPrice(
  productSkuCode: number,
  customer: string
): Promise<HistoricalPriceResponse> {
  const params = new URLSearchParams({
    product_sku_code: String(productSkuCode),
    customer,
  });
  return apiFetch<HistoricalPriceResponse>(`/v1/historical-price?${params}`);
}
