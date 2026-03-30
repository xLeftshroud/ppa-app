import { useQuery, useQueryClient } from "@tanstack/react-query";
import { runSimulation } from "@/api/simulate";
import { useAppStore } from "@/store/useAppStore";
import { useCallback, useEffect, useRef, useState } from "react";
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
    attrBrand,
    attrFlavor,
    attrPackType,
    attrPackSize,
    attrUnitsPkg,
    setSimulateResult,
  } = useAppStore();

  const queryClient = useQueryClient();

  // Debounce params
  const [debouncedParams, setDebouncedParams] = useState<SimulateRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const hasBaseline = !!baseline || baselineOverride != null;
  const canSimulate = !!datasetId && !!selectedCustomer;

  const buildParams = useCallback((): SimulateRequest | null => {
    if (!canSimulate) return null;
    return {
      dataset_id: datasetId!,
      product_sku_code: selectedSku,
      customer: selectedCustomer!,
      promotion_indicator: promotionIndicator,
      week,
      top_brand: attrBrand,
      flavor_internal: attrFlavor,
      pack_type_internal: attrPackType,
      pack_size_internal: attrPackSize,
      units_per_package_internal: attrUnitsPkg,
      baseline_override_price_per_litre: baselineOverride,
      selected_price_change_pct: selectedNewPrice != null ? null : (hasBaseline ? selectedPriceChangePct : null),
      selected_new_price_per_litre: selectedNewPrice,
    };
  }, [datasetId, selectedSku, selectedCustomer, promotionIndicator, week, attrBrand, attrFlavor, attrPackType, attrPackSize, attrUnitsPkg, baselineOverride, selectedPriceChangePct, selectedNewPrice, canSimulate, hasBaseline]);

  useEffect(() => {
    const params = buildParams();
    if (!params) {
      setDebouncedParams(null);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedParams(params), 300);

    return () => clearTimeout(timerRef.current);
  }, [buildParams]);

  const queryKey = [
    "simulate",
    debouncedParams?.dataset_id,
    debouncedParams?.product_sku_code,
    debouncedParams?.customer,
    debouncedParams?.week,
    debouncedParams?.promotion_indicator,
    debouncedParams?.top_brand,
    debouncedParams?.flavor_internal,
    debouncedParams?.pack_type_internal,
    debouncedParams?.pack_size_internal,
    debouncedParams?.units_per_package_internal,
    debouncedParams?.baseline_override_price_per_litre ?? "auto",
    debouncedParams?.selected_new_price_per_litre ?? debouncedParams?.selected_price_change_pct,
  ];

  const query = useQuery({
    queryKey,
    queryFn: () => runSimulation(debouncedParams!),
    enabled: !!debouncedParams,
    structuralSharing: false,
  });

  useEffect(() => {
    if (query.data) {
      setSimulateResult(query.data);
    }
  }, [query.data, setSimulateResult]);

  // Manual trigger: skip debounce, set params, and force refetch
  const runNow = useCallback(() => {
    const params = buildParams();
    if (!params) return;
    clearTimeout(timerRef.current);
    setDebouncedParams(params);
    // Invalidate cached simulate queries so a fresh fetch always happens
    queryClient.invalidateQueries({ queryKey: ["simulate"] });
  }, [buildParams, queryClient]);

  return { ...query, canSimulate, runNow };
}
