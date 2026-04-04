import { useQuery } from "@tanstack/react-query";
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
    baselinePrice,
    selectedPriceChangePct,
    selectedNewPrice,
    attrBrand,
    attrFlavor,
    attrPackType,
    attrPackSize,
    attrUnitsPkg,
    setSimulateResult,
  } = useAppStore();

  const [submittedParams, setSubmittedParams] = useState<SimulateRequest | null>(null);
  const runCounter = useRef(0);
  const [runId, setRunId] = useState(0);

  const canUsePercentage = baselinePrice != null;
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
      baseline_override_price_per_litre: baselinePrice,
      selected_price_change_pct: selectedNewPrice != null ? null : (canUsePercentage ? selectedPriceChangePct : null),
      selected_new_price_per_litre: selectedNewPrice,
    };
  }, [datasetId, selectedSku, selectedCustomer, promotionIndicator, week, attrBrand, attrFlavor, attrPackType, attrPackSize, attrUnitsPkg, baselinePrice, selectedPriceChangePct, selectedNewPrice, canSimulate, canUsePercentage]);

  const query = useQuery({
    queryKey: ["simulate", runId],
    queryFn: () => runSimulation(submittedParams!),
    enabled: !!submittedParams && runId > 0,
    structuralSharing: false,
  });

  useEffect(() => {
    if (query.data) {
      setSimulateResult(query.data);
    }
  }, [query.data, setSimulateResult]);

  // Manual trigger: build params, bump counter to force fresh query
  const runNow = useCallback(() => {
    const params = buildParams();
    if (!params) return;
    runCounter.current += 1;
    setSubmittedParams(params);
    setRunId(runCounter.current);
  }, [buildParams]);

  return { ...query, canSimulate, runNow };
}
