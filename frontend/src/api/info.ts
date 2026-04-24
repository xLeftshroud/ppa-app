import { apiFetch } from "./client";
import type { InfoResponse } from "@/types/api";

export async function fetchInfo(): Promise<InfoResponse> {
  return apiFetch<InfoResponse>("/v1/info");
}
