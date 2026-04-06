import { apiFetch } from "./client";
import type { SimulateRequest, SimulateResponse, PredictPointsRequest, PredictPointsResponse } from "@/types/api";

export async function runSimulation(body: SimulateRequest): Promise<SimulateResponse> {
  return apiFetch<SimulateResponse>("/v1/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function predictPoints(body: PredictPointsRequest): Promise<PredictPointsResponse> {
  return apiFetch<PredictPointsResponse>("/v1/predict-points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
