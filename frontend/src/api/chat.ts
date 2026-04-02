import { apiFetch } from "./client";
import type { UIAction, SuggestedAction } from "@/store/useChatStore";

export interface AppStateSnapshot {
  dataset_id: string | null;
  selected_sku: number | null;
  sku_description: string | null;
  brand: string | null;
  flavor: string | null;
  pack_type: string | null;
  pack_size: number | null;
  units_pkg: number | null;
  customer: string | null;
  promotion: 0 | 1;
  week: number;
  baseline_price: number | null;
  baseline_volume: number | null;
  baseline_override: number | null;
  price_change_pct: number;
  selected_new_price: number | null;
  has_simulation_result: boolean;
  last_predicted_volume: number | null;
  last_elasticity: number | null;
  last_delta_volume_pct: number | null;
}

export interface ChatApiRequest {
  message: string;
  conversation_history: { role: string; content: string }[];
  app_state: AppStateSnapshot;
}

export interface ChatApiResponse {
  assistant_message: string;
  ui_actions: UIAction[];
  suggested_actions: SuggestedAction[];
}

export function sendChatMessage(body: ChatApiRequest): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>("/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
