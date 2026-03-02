import { useQuery } from "@tanstack/react-query";
import { runSimulation } from "@/api/simulate";
import { useAppStore } from "@/store/useAppStore";
import { useEffect, useRef, useState } from "react";
import type { SimulateRequest } from "@/types/api";

export function useSimulate() {
  const {
    datasetId,
    selectedSku,
    selectedCustomer,
    promotionIndicator,
    week,
    baseline,
    baselineOverride,
    selectedPriceChangePct,
    selectedNewPrice,
    setSimulateResult,
  } = useAppStore();

  // Debounce params
  const [debouncedParams, setDebouncedParams] = useState<SimulateRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasBaseline = !!baseline || baselineOverride != null;
  const canSimulate = !!datasetId && selectedSku != null && !!selectedCustomer;

  // When no baseline and no override, we need a direct price (can't use percentage)
  const needsDirectPrice = !hasBaseline && selectedNewPrice == null;

  useEffect(() => {
    if (!canSimulate || needsDirectPrice) {
      setDebouncedParams(null);
      return;
    }

    const params: SimulateRequest = {
      dataset_id: datasetId!,
      product_sku_code: selectedSku!,
      customer: selectedCustomer!,
      promotion_indicator: promotionIndicator,
      week,
      baseline_override_price_per_litre: baselineOverride,
      selected_price_change_pct: selectedNewPrice != null ? null : selectedPriceChangePct,
      selected_new_price_per_litre: selectedNewPrice,
    };

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedParams(params), 300);

    return () => clearTimeout(timerRef.current);
  }, [datasetId, selectedSku, selectedCustomer, promotionIndicator, week, baselineOverride, selectedPriceChangePct, selectedNewPrice, canSimulate, baseline, needsDirectPrice]);

  const query = useQuery({
    queryKey: [
      "simulate",
      debouncedParams?.dataset_id,
      debouncedParams?.product_sku_code,
      debouncedParams?.customer,
      debouncedParams?.week,
      debouncedParams?.promotion_indicator,
      debouncedParams?.baseline_override_price_per_litre ?? "auto",
      debouncedParams?.selected_new_price_per_litre ?? debouncedParams?.selected_price_change_pct,
    ],
    queryFn: () => runSimulation(debouncedParams!),
    enabled: !!debouncedParams,
  });

  useEffect(() => {
    if (query.data) {
      setSimulateResult(query.data);
    }
  }, [query.data, setSimulateResult]);

  return { ...query, canSimulate };
}
