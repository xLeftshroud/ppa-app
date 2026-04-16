import { useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChatStore } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import { fetchChatProviders, sendChatMessage, type AppStateSnapshot } from "@/api/chat";
import { applyUIAction } from "./useChatActions";
import { useSkus } from "./useCatalog";
import type { SkuItem } from "@/types/api";

function buildSnapshot(): AppStateSnapshot {
  const s = useAppStore.getState();
  return {
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
    baseline_price: s.historicalBaseline?.price_per_litre ?? null,
    baseline_volume: s.historicalBaseline?.volume_units ?? null,
    baseline_price_input: s.baselinePrice,
    price_input_mode: s.priceInputMode,
    price_change_pct: s.selectedPriceChangePct,
    selected_new_price: s.selectedNewPrice,
    has_simulation_result: s.simulateResult !== null,
    last_predicted_volume: s.simulateResult?.selected?.predicted_volume_units ?? null,
    last_elasticity: s.simulateResult?.selected?.elasticity ?? null,
    last_delta_volume_pct: s.simulateResult?.selected?.delta_volume_pct ?? null,
    custom_plots: s.customPlots.map((plot) => ({
      id: plot.id,
      title: plot.title,
      color: plot.color,
      is_visible: plot.isVisible,
      columns: [...plot.columns],
    })),
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
    selectedProvider,
    setSelectedProvider,
    clearHistory,
  } = useChatStore();

  const { data: skuData } = useSkus();
  const skuItemsRef = useRef<SkuItem[] | undefined>(undefined);
  skuItemsRef.current = skuData?.items;

  const providersQuery = useQuery({
    queryKey: ["chatProviders"],
    queryFn: fetchChatProviders,
    staleTime: Infinity,
  });

  const providerOptions = providersQuery.data?.providers ?? [];
  const enabledProviders = providerOptions.filter((provider) => provider.enabled);

  useEffect(() => {
    if (!providersQuery.data) return;

    if (enabledProviders.length === 0) {
      if (selectedProvider !== null) {
        setSelectedProvider(null);
      }
      return;
    }

    const currentIsEnabled = selectedProvider != null && enabledProviders.some((provider) => provider.id === selectedProvider);
    if (currentIsEnabled) return;

    const fallbackProvider =
      providersQuery.data.default_provider && enabledProviders.some((provider) => provider.id === providersQuery.data.default_provider)
        ? providersQuery.data.default_provider
        : enabledProviders[0].id;

    if (fallbackProvider !== selectedProvider) {
      setSelectedProvider(fallbackProvider);
    }
  }, [enabledProviders, providersQuery.data, selectedProvider, setSelectedProvider]);

  const activeProvider =
    (selectedProvider && enabledProviders.find((provider) => provider.id === selectedProvider)) ??
    null;
  const canSwitchProviders = enabledProviders.length === 2;
  const isChatAvailable = enabledProviders.length > 0 || !providersQuery.data;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !isChatAvailable) return;

      const history = useChatStore
        .getState()
        .messages.filter((m) => m.role !== "system")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      addUserMessage(trimmed);
      setLoading(true);

      const snapshot = buildSnapshot();

      try {
        const response = await sendChatMessage({
          message: trimmed,
          conversation_history: history,
          app_state: snapshot,
          provider: selectedProvider,
        });

        // Apply UI actions
        let shouldTriggerSim = false;
        for (const action of response.ui_actions) {
          if (action.action === "trigger_simulation") {
            shouldTriggerSim = true;
          } else {
            applyUIAction(action, skuItemsRef.current);
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
    [addUserMessage, isChatAvailable, selectedProvider, setLoading, addAssistantMessage, addSystemError, setSuggestedActions, runSimulation],
  );

  return {
    messages,
    isOpen,
    isLoading,
    suggestedActions,
    selectedProvider,
    setSelectedProvider,
    activeProvider,
    canSwitchProviders,
    isChatAvailable,
    areProvidersLoaded: !!providersQuery.data,
    toggleOpen,
    setOpen,
    sendMessage,
    clearHistory,
  };
}
