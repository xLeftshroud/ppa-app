import { apiFetch } from "./client";
import type { ChatProviderId, UIAction, SuggestedAction } from "@/store/useChatStore";

export interface ChatCustomPlotSummary {
  id: string;
  title: string;
  color: string;
  is_visible: boolean;
  columns: string[];
}

export interface AppStateSnapshot {
  selected_sku: number | null;
  sku_description: string | null;
  brand: string | null;
  flavor: string | null;
  pack_type: string | null;
  pack_size: number | null;
  units_pkg: number | null;
  customer: string | null;
  promotion: 0 | 1;
  week: number | null;
  baseline_price: number | null;
  historical_price: number | null;
  historical_volume: number | null;
  historical_yearweek: number | null;
  price_input_mode: "direct" | "percentage";
  price_change_pct: number;
  selected_new_price: number | null;
  has_simulation_result: boolean;
  last_predicted_volume: number | null;
  last_elasticity: number | null;
  last_delta_volume_pct: number | null;
  custom_plots: ChatCustomPlotSummary[];
}

export interface ChatApiRequest {
  message: string;
  conversation_history: { role: string; content: string }[];
  app_state: AppStateSnapshot;
  provider?: ChatProviderId | null;
}

export interface ChatApiResponse {
  assistant_message: string;
  ui_actions: UIAction[];
  suggested_actions: SuggestedAction[];
}

export interface ChatProviderConfig {
  id: ChatProviderId;
  label: string;
  enabled: boolean;
  model: string | null;
}

export interface ChatProvidersResponse {
  default_provider: ChatProviderId | null;
  providers: ChatProviderConfig[];
}

export function fetchChatProviders(): Promise<ChatProvidersResponse> {
  return apiFetch<ChatProvidersResponse>("/v1/chat/providers");
}

export function sendChatMessage(body: ChatApiRequest): Promise<ChatApiResponse> {
  return apiFetch<ChatApiResponse>("/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
