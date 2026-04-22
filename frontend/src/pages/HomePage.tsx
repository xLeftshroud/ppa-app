import { useEffect, useMemo } from "react";
import { ApiError } from "@/api/client";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ChatToggleButton } from "@/components/chat/ChatToggleButton";
import { BaselinePriceInput } from "@/components/inputs/BaselinePriceInput";
import { CustomerSelect } from "@/components/inputs/CustomerSelect";
import { PriceSlider } from "@/components/inputs/PriceSlider";
import { PromotionToggle } from "@/components/inputs/PromotionToggle";
import { WeekInput } from "@/components/inputs/WeekInput";
import { Button } from "@/components/ui/button";
import { DemandCurveChart } from "@/components/results/DemandCurveChart";
import { CustomPlotsSidebar } from "@/components/results/CustomPlotsSidebar";
import { PriceRangeCard } from "@/components/results/PriceRangeCard";
import { ResultsCard } from "@/components/results/ResultsCard";
import { WarningsBanner } from "@/components/results/WarningsBanner";
import { PackTypeSelect } from "@/components/sku/PackTypeSelect";
import { NullableNumberInput } from "@/components/sku/NullableNumberInput";
import { SearchableAttrSelect } from "@/components/sku/SearchableAttrSelect";
import { SkuSelector } from "@/components/sku/SkuSelector";
import { useAllCustomPlotData } from "@/hooks/useAllCustomPlotData";
import { useBrands, useFlavors, usePackTypes } from "@/hooks/useCatalog";
import { useChat } from "@/hooks/useChat";
import { useSimulate } from "@/hooks/useSimulate";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export function HomePage() {
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
  const chat = useChat(runNow);
  const isChatOpen = chat.isOpen;

  const priceRange = useAppStore((s) => s.priceRange);
  const { data: brands = [] } = useBrands();
  const { data: flavors = [] } = useFlavors();
  const { data: packTypes = [] } = usePackTypes();
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
    if (error instanceof ApiError) {
      const detailsStr = error.details.length > 0 ? `: ${error.details.join(", ")}` : "";
      toast({
        variant: "destructive",
        title: `Error: ${error.code}`,
        description: `${error.message}${detailsStr} (request_id: ${error.request_id})`,
      });
    }
  }, [error]);

  return (
    <>
      <div
        className={cn(
          "px-4 py-3 transition-[padding] duration-200 ease-in-out md:[--chat-inline-width:280px] lg:[--chat-inline-width:320px] xl:[--chat-inline-width:360px] 2xl:[--chat-inline-width:400px]",
          isChatOpen ? "md:px-4 lg:px-5 xl:px-6 2xl:px-8" : "md:px-6 xl:px-8 2xl:px-10",
        )}
      >
        <div
          className="mx-auto md:grid md:items-start md:gap-6"
          style={{
            gridTemplateColumns: isChatOpen ? "minmax(0, 1fr) var(--chat-inline-width)" : "minmax(0, 1fr) 0px",
            maxWidth: isChatOpen ? "1920px" : "1600px",
            transition: "grid-template-columns 200ms ease, max-width 200ms ease",
          }}
        >
          <div className="min-w-0">
            <div className={cn("flex flex-col gap-6", isChatOpen ? "xl:flex-row" : "lg:flex-row")}>
              <div
                className={cn(
                  "min-w-0 w-full shrink-0 space-y-3",
                  isChatOpen ? "xl:w-[360px] 2xl:w-[380px]" : "lg:w-[380px]",
                )}
              >
                <div className="space-y-1">
                  <h2 className="mb-1 text-lg font-semibold">SKU Selection</h2>
                  <SkuSelector />
                  <div className="grid grid-cols-2 gap-2">
                    <SearchableAttrSelect label="Brand" options={brands} value={attrBrand} onChange={setAttrBrand} />
                    <SearchableAttrSelect label="Flavor" options={flavors} value={attrFlavor} onChange={setAttrFlavor} />
                    <PackTypeSelect options={packTypes} value={attrPackType} onChange={setAttrPackType} />
                    <NullableNumberInput label="Units/Pkg" value={attrUnitsPkg} onChange={setAttrUnitsPkg} min={1} />
                    <NullableNumberInput label="Pack Size" value={attrPackSize} onChange={setAttrPackSize} min={1} />
                    <div className="flex items-end">
                      <Button variant="outline" size="sm" className="w-full" onClick={clearSkuAttrs}>
                        Clear All
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 border-t pt-2">
                  <h2 className="mb-0.5 text-lg font-semibold">Prediction Controls</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <CustomerSelect />
                    <WeekInput />
                  </div>
                  <PromotionToggle />
                </div>

                <div className="border-t pt-2">
                  <h2 className="mb-1 text-lg font-semibold">Baseline & Price</h2>
                  <div className="space-y-1">
                    <BaselinePriceInput />
                    <PriceSlider />
                  </div>
                </div>

                <Button className="w-full" disabled={!canSimulate || isFetching} onClick={runNow}>
                  {isFetching ? "Simulating..." : "Run Simulation"}
                </Button>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <WarningsBanner />
                <ResultsCard isLoading={isLoading || isFetching} />
                <PriceRangeCard priceRange={priceRange} />
                <div className={cn("flex min-w-0 gap-4", isChatOpen ? "flex-col 2xl:flex-row" : "lg:flex-row")}>
                  <div className="min-w-0 flex-1">
                    <DemandCurveChart
                      isLoading={isLoading || isFetching}
                      priceRange={priceRange}
                      scatterOverlays={scatterOverlays}
                    />
                  </div>
                  <div className={cn("shrink-0", isChatOpen ? "w-full 2xl:w-[240px]" : "w-[240px]")}>
                    <CustomPlotsSidebar />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ChatPanel chat={chat} />
        </div>
      </div>

      {!chat.isOpen && <ChatToggleButton onClick={chat.toggleOpen} />}
    </>
  );
}
