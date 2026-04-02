import { useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import { sendChatMessage, type AppStateSnapshot } from "@/api/chat";
import { applyUIAction } from "./useChatActions";

function buildSnapshot(): AppStateSnapshot {
  const s = useAppStore.getState();
  return {
    dataset_id: s.datasetId,
    selected_sku: s.selectedSku,
    sku_description: s.skuAttributes?.material_medium_description ?? null,
    brand: s.attrBrand,
    flavor: s.attrFlavor,
    pack_type: s.attrPackType,
    pack_size: s.attrPackSize,
    units_pkg: s.attrUnitsPkg,
    customer: s.selectedCustomer,
    promotion: s.promotionIndicator,
    week: s.week,
    baseline_price: s.baseline?.price_per_litre ?? null,
    baseline_volume: s.baseline?.volume_units ?? null,
    baseline_override: s.baselineOverride,
    price_change_pct: s.selectedPriceChangePct,
    selected_new_price: s.selectedNewPrice,
    has_simulation_result: s.simulateResult !== null,
    last_predicted_volume: s.simulateResult?.selected?.predicted_volume_units ?? null,
    last_elasticity: s.simulateResult?.selected?.elasticity ?? null,
    last_delta_volume_pct: s.simulateResult?.selected?.delta_volume_pct ?? null,
  };
}

export function useChat(runSimulation?: () => void) {
  const {
    messages,
    isOpen,
    isLoading,
    suggestedActions,
    toggleOpen,
    setOpen,
    addUserMessage,
    addAssistantMessage,
    addSystemError,
    setLoading,
    setSuggestedActions,
    clearHistory,
  } = useChatStore();

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      addUserMessage(trimmed);
      setLoading(true);

      const snapshot = buildSnapshot();
      const history = useChatStore
        .getState()
        .messages.filter((m) => m.role !== "system")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        const response = await sendChatMessage({
          message: trimmed,
          conversation_history: history,
          app_state: snapshot,
        });

        // Apply UI actions
        let shouldTriggerSim = false;
        for (const action of response.ui_actions) {
          if (action.action === "trigger_simulation") {
            shouldTriggerSim = true;
          } else {
            applyUIAction(action);
          }
        }

        // Trigger simulation after other state updates have propagated
        if (shouldTriggerSim && runSimulation) {
          // Small delay to let Zustand state propagate
          setTimeout(() => runSimulation(), 50);
        }

        addAssistantMessage(response.assistant_message);
        setSuggestedActions(response.suggested_actions);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Chat request failed";
        addSystemError(msg);
      } finally {
        setLoading(false);
      }
    },
    [addUserMessage, setLoading, addAssistantMessage, addSystemError, setSuggestedActions, runSimulation],
  );

  return {
    messages,
    isOpen,
    isLoading,
    suggestedActions,
    toggleOpen,
    setOpen,
    sendMessage,
    clearHistory,
  };
}
