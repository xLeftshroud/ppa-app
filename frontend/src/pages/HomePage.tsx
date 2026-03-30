import { CsvUploadZone } from "@/components/upload/CsvUploadZone";
import { SkuSelector } from "@/components/sku/SkuSelector";
import { SearchableAttrSelect } from "@/components/sku/SearchableAttrSelect";
import { PackTypeSelect } from "@/components/sku/PackTypeSelect";
import { NullableNumberInput } from "@/components/sku/NullableNumberInput";
import { CustomerSelect } from "@/components/inputs/CustomerSelect";
import { PromotionToggle } from "@/components/inputs/PromotionToggle";
import { WeekInput } from "@/components/inputs/WeekInput";
import { BaselinePriceInput } from "@/components/inputs/BaselinePriceInput";
import { PriceSlider } from "@/components/inputs/PriceSlider";
import { ResultsCard } from "@/components/results/ResultsCard";
import { PriceRangeCard } from "@/components/results/PriceRangeCard";
import { DemandCurveChart } from "@/components/results/DemandCurveChart";
import { CustomPlotsSidebar } from "@/components/results/CustomPlotsSidebar";
import { WarningsBanner } from "@/components/results/WarningsBanner";
import { useSimulate } from "@/hooks/useSimulate";
import { usePriceRange } from "@/hooks/usePriceRange";
import { useBrands, useFlavors, usePackTypes } from "@/hooks/useCatalog";
import { useAllCustomPlotData } from "@/hooks/useAllCustomPlotData";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/api/client";
import { toast } from "@/hooks/useToast";
import { useEffect, useMemo } from "react";

export function HomePage() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const attrBrand = useAppStore((s) => s.attrBrand);
  const attrFlavor = useAppStore((s) => s.attrFlavor);
  const attrPackType = useAppStore((s) => s.attrPackType);
  const attrPackSize = useAppStore((s) => s.attrPackSize);
  const attrUnitsPkg = useAppStore((s) => s.attrUnitsPkg);
  const setAttrBrand = useAppStore((s) => s.setAttrBrand);
  const setAttrFlavor = useAppStore((s) => s.setAttrFlavor);
  const setAttrPackType = useAppStore((s) => s.setAttrPackType);
  const setAttrPackSize = useAppStore((s) => s.setAttrPackSize);
  const setAttrUnitsPkg = useAppStore((s) => s.setAttrUnitsPkg);
  const clearSkuAttrs = useAppStore((s) => s.clearSkuAttrs);
  const { isLoading, isFetching, error, canSimulate, runNow } = useSimulate();
  const { data: priceRange } = usePriceRange(selectedSku);
  const { data: brands = [] } = useBrands(datasetId);
  const { data: flavors = [] } = useFlavors(datasetId);
  const { data: packTypes = [] } = usePackTypes(datasetId);
  const customPlotData = useAllCustomPlotData();
  const scatterOverlays = useMemo(
    () =>
      customPlotData
        .filter((d) => d.data)
        .map((d) => ({
          id: d.plot.id,
          title: d.plot.title,
          color: d.plot.color,
          points: d.data!.points,
        })),
    [customPlotData],
  );

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError) {
        toast({
          variant: "destructive",
          title: `Error: ${error.code}`,
          description: `${error.message} (request_id: ${error.request_id})`,
        });
      }
    }
  }, [error]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 max-w-[1600px] mx-auto">
      {/* Left Panel — Inputs */}
      <div className="w-full lg:w-[380px] shrink-0 space-y-5">
        <div>
          <h2 className="text-lg font-semibold mb-3">Data Upload</h2>
          <CsvUploadZone />
        </div>

        {datasetId && (
          <>
            <div className="border-t pt-4 space-y-3">
              <h2 className="text-lg font-semibold mb-3">SKU Selection</h2>
              <SkuSelector />
              <div className="grid grid-cols-2 gap-3">
                <SearchableAttrSelect label="Brand" options={brands} value={attrBrand} onChange={setAttrBrand} disabled={!datasetId} />
                <SearchableAttrSelect label="Flavor" options={flavors} value={attrFlavor} onChange={setAttrFlavor} disabled={!datasetId} />
                <PackTypeSelect options={packTypes} value={attrPackType} onChange={setAttrPackType} disabled={!datasetId} />
                <NullableNumberInput label="Units/Pkg" value={attrUnitsPkg} onChange={setAttrUnitsPkg} min={1} disabled={!datasetId} />
                <NullableNumberInput label="Pack Size" value={attrPackSize} onChange={setAttrPackSize} min={1} disabled={!datasetId} />
                <div className="flex items-end">
                  <Button variant="outline" size="sm" className="w-full" onClick={clearSkuAttrs}>Clear All</Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h2 className="text-lg font-semibold mb-1">Prediction Controls</h2>
              <CustomerSelect />
              <PromotionToggle />
              <WeekInput />
            </div>

            <div className="border-t pt-4">
              <h2 className="text-lg font-semibold mb-3">Baseline & Price</h2>
              <div className="space-y-4">
                <BaselinePriceInput />
                <PriceSlider />
              </div>
            </div>

            <Button className="w-full" disabled={!canSimulate || isFetching} onClick={runNow}>
              {isFetching ? "Simulating..." : "Run Simulation"}
            </Button>
          </>
        )}
      </div>

      {/* Right Panel — Results */}
      <div className="flex-1 space-y-4 min-w-0">
        <WarningsBanner />
        <ResultsCard isLoading={isLoading || isFetching} />
        <PriceRangeCard priceRange={priceRange ?? null} />
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <DemandCurveChart isLoading={isLoading || isFetching} priceRange={priceRange ?? null} scatterOverlays={scatterOverlays} />
          </div>
          <div className="w-[240px] shrink-0">
            <CustomPlotsSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
