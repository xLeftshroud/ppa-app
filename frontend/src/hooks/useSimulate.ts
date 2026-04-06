import { useCallback, useRef, useState } from "react";
import { runSimulation, predictPoints } from "@/api/simulate";
import { fetchPriceRange } from "@/api/priceRange";
import { useAppStore } from "@/store/useAppStore";
import type { SimulateRequest, PredictPointsRequest, SimulateResponse } from "@/types/api";

/** Build a fingerprint string from all curve-affecting features (everything except prices). */
function buildFingerprint(s: {
  datasetId: string;
  selectedSku: number | null;
  selectedCustomer: string | null;
  promotionIndicator: 0 | 1;
  week: number | null;
  attrBrand: string | null;
  attrFlavor: string | null;
  attrPackType: string | null;
  attrPackSize: number | null;
  attrUnitsPkg: number | null;
}): string {
  return JSON.stringify([
    s.datasetId,
    s.selectedSku,
    s.selectedCustomer,
    s.promotionIndicator,
    s.week,
    s.attrBrand,
    s.attrFlavor,
    s.attrPackType,
    s.attrPackSize,
    s.attrUnitsPkg,
  ]);
}

export function useSimulate() {
  const {
    datasetId,
    selectedSku,
    selectedCustomer,
    promotionIndicator,
    week,
    priceInputMode,
    baselinePrice,
    selectedPriceChangePct,
    selectedNewPrice,
    attrBrand,
    attrFlavor,
    attrPackType,
    attrPackSize,
    attrUnitsPkg,
    cachedCurve,
    cachedCurveFingerprint,
    setSimulateResult,
    setPriceRange,
    setCachedCurve,
    commitAttrs,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const runCounter = useRef(0);

  const canSimulate = !!datasetId;

  const runNow = useCallback(async () => {
    if (!datasetId) return;

    const canUsePercentage = baselinePrice != null;
    const currentFingerprint = buildFingerprint({
      datasetId,
      selectedSku,
      selectedCustomer,
      promotionIndicator,
      week,
      attrBrand,
      attrFlavor,
      attrPackType,
      attrPackSize,
      attrUnitsPkg,
    });

    runCounter.current += 1;
    const thisRun = runCounter.current;
    setIsLoading(true);
    setError(null);
    commitAttrs();

    try {
      const curveChanged = currentFingerprint !== cachedCurveFingerprint || !cachedCurve;

      if (curveChanged) {
        // Full simulation: regenerate curve + predict points + price range
        const params: SimulateRequest = {
          dataset_id: datasetId,
          product_sku_code: selectedSku,
          customer: selectedCustomer,
          promotion_indicator: promotionIndicator,
          week,
          top_brand: attrBrand,
          flavor_internal: attrFlavor,
          pack_type_internal: attrPackType,
          pack_size_internal: attrPackSize,
          units_per_package_internal: attrUnitsPkg,
          baseline_override_price_per_litre: baselinePrice,
          selected_price_change_pct: priceInputMode === "percentage" && canUsePercentage ? selectedPriceChangePct : null,
          selected_new_price_per_litre: priceInputMode === "direct" ? selectedNewPrice : null,
        };

        const [result, priceRangeResult] = await Promise.all([
          runSimulation(params),
          selectedSku != null ? fetchPriceRange(selectedSku).catch(() => null) : Promise.resolve(null),
        ]);
        if (thisRun !== runCounter.current) return; // stale
        setCachedCurve(result.curve, currentFingerprint);
        setPriceRange(priceRangeResult);
        setSimulateResult(result);
      } else {
        // Lightweight: only predict baseline + selected points, reuse cached curve
        // Compute the selected price to send
        let selectedPrice: number | null = null;
        if (priceInputMode === "direct") {
          selectedPrice = selectedNewPrice;
        } else if (priceInputMode === "percentage" && canUsePercentage) {
          selectedPrice = baselinePrice! * (1 + selectedPriceChangePct / 100);
        }

        const pointsReq: PredictPointsRequest = {
          dataset_id: datasetId,
          product_sku_code: selectedSku,
          customer: selectedCustomer,
          promotion_indicator: promotionIndicator,
          week,
          top_brand: attrBrand,
          flavor_internal: attrFlavor,
          pack_type_internal: attrPackType,
          pack_size_internal: attrPackSize,
          units_per_package_internal: attrUnitsPkg,
          baseline_price: baselinePrice,
          selected_price: selectedPrice,
        };

        const pointsResult = await predictPoints(pointsReq);
        if (thisRun !== runCounter.current) return; // stale

        // Get previous simulateResult for model_info and warnings
        const prev = useAppStore.getState().simulateResult;

        // Build merged SimulateResponse
        const merged: SimulateResponse = {
          model_info: prev?.model_info ?? { model_name: "", model_version: "", features_version: "" },
          warnings: prev?.warnings ?? [],
          baseline: pointsResult.baseline
            ? { yearweek: 0, price_per_litre: pointsResult.baseline.price_per_litre, volume_units: pointsResult.baseline.predicted_volume }
            : null,
          baseline_elasticity: pointsResult.baseline?.elasticity ?? null,
          selected: pointsResult.selected
            ? {
                price_change_pct: baselinePrice && pointsResult.selected.price_per_litre
                  ? ((pointsResult.selected.price_per_litre - baselinePrice) / baselinePrice) * 100
                  : 0,
                new_price_per_litre: pointsResult.selected.price_per_litre,
                predicted_volume_units: pointsResult.selected.predicted_volume,
                delta_volume_units: pointsResult.baseline
                  ? pointsResult.selected.predicted_volume - pointsResult.baseline.predicted_volume
                  : 0,
                delta_volume_pct: pointsResult.baseline && pointsResult.baseline.predicted_volume !== 0
                  ? ((pointsResult.selected.predicted_volume - pointsResult.baseline.predicted_volume) / pointsResult.baseline.predicted_volume) * 100
                  : 0,
                elasticity: pointsResult.selected.elasticity,
              }
            : null,
          arc_elasticity: pointsResult.arc_elasticity,
          curve: cachedCurve,
        };

        setSimulateResult(merged);
      }
    } catch (err) {
      if (thisRun !== runCounter.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (thisRun === runCounter.current) {
        setIsLoading(false);
      }
    }
  }, [
    datasetId, selectedSku, selectedCustomer, promotionIndicator, week,
    attrBrand, attrFlavor, attrPackType, attrPackSize, attrUnitsPkg,
    baselinePrice, priceInputMode, selectedPriceChangePct, selectedNewPrice,
    cachedCurve, cachedCurveFingerprint,
    setSimulateResult, setPriceRange, setCachedCurve, commitAttrs,
  ]);

  return { isLoading, isFetching: isLoading, error, canSimulate, runNow };
}
