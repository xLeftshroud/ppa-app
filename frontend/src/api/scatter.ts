import { apiFetch } from "./client";
import type { ScatterRequest, ScatterResponse } from "@/types/api";

export function fetchScatter(req: ScatterRequest): Promise<ScatterResponse> {
  return apiFetch<ScatterResponse>("/v1/scatter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
