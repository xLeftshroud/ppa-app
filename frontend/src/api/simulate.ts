import { apiFetch } from "./client";
import type { SimulateRequest, SimulateResponse } from "@/types/api";

export async function runSimulation(body: SimulateRequest): Promise<SimulateResponse> {
  return apiFetch<SimulateResponse>("/v1/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
