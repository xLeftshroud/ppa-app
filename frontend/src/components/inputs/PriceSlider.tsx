import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PriceSlider() {
  const priceInputMode = useAppStore((s) => s.priceInputMode);
  const setPriceInputMode = useAppStore((s) => s.setPriceInputMode);
  const selectedPriceChangePct = useAppStore((s) => s.selectedPriceChangePct);
  const selectedNewPrice = useAppStore((s) => s.selectedNewPrice);
  const baselinePrice = useAppStore((s) => s.baselinePrice);
  const setPriceChangePct = useAppStore((s) => s.setPriceChangePct);
  const setNewPrice = useAppStore((s) => s.setNewPrice);

  const hasBasePrice = baselinePrice != null && baselinePrice > 0;

  // Force direct mode if no baseline price
  useEffect(() => {
    if (!hasBasePrice && priceInputMode === "percentage") {
      setPriceInputMode("direct");
    }
  }, [hasBasePrice, priceInputMode, setPriceInputMode]);

  // Computed values for the inactive mode
  const computedDirectPrice =
    hasBasePrice ? Math.max(0.01, baselinePrice * (1 + selectedPriceChangePct / 100)) : 0;
  const computedPct =
    hasBasePrice && selectedNewPrice != null
      ? (selectedNewPrice / baselinePrice - 1) * 100
      : 0;

  // --- Percentage draft ---
  const displayPct = priceInputMode === "percentage" ? selectedPriceChangePct : computedPct;
  const [pctDraft, setPctDraft] = useState(String(displayPct));

  useEffect(() => {
    setPctDraft(String(Math.round(displayPct * 10) / 10));
  }, [displayPct]);

  const commitPct = () => {
    const num = parseFloat(pctDraft);
    if (!isNaN(num) && num >= -100 && num <= 100) {
      if (num !== selectedPriceChangePct) setPriceChangePct(num);
    } else {
      setPctDraft(String(Math.round(displayPct * 10) / 10));
    }
  };

  // --- Direct price draft ---
  const displayPrice = priceInputMode === "direct" ? selectedNewPrice : computedDirectPrice;
  const [priceDraft, setPriceDraft] = useState(
    displayPrice != null && displayPrice > 0 ? String(displayPrice) : ""
  );

  useEffect(() => {
    if (priceInputMode === "direct") {
      setPriceDraft(selectedNewPrice != null ? String(selectedNewPrice) : "");
    } else {
      setPriceDraft(computedDirectPrice > 0 ? computedDirectPrice.toFixed(4) : "");
    }
  }, [selectedNewPrice, computedDirectPrice, priceInputMode]);

  const commitPrice = () => {
    if (priceDraft === "") {
      if (selectedNewPrice !== null) setNewPrice(null);
    } else {
      const num = parseFloat(priceDraft);
      if (!isNaN(num) && num >= 0.01) {
        if (num !== selectedNewPrice) setNewPrice(num);
      } else {
        setPriceDraft(selectedNewPrice != null ? String(selectedNewPrice) : "");
      }
    }
  };

  const isPctMode = priceInputMode === "percentage";
  const isDirectMode = priceInputMode === "direct";

  return (
    <div className="space-y-3">
      {/* Mode switch */}
      <div className="flex gap-1">
        <Button
          variant={isPctMode ? "default" : "outline"}
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => setPriceInputMode("percentage")}
          disabled={!hasBasePrice}
        >
          % Change
        </Button>
        <Button
          variant={isDirectMode ? "default" : "outline"}
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => setPriceInputMode("direct")}
        >
          Direct Price
        </Button>
      </div>

      {!hasBasePrice && isPctMode && (
        <p className="text-xs text-amber-600">
          Set a baseline price to use percentage mode.
        </p>
      )}

      {/* Percentage input + slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className={!isPctMode ? "text-muted-foreground" : ""}>
            Price Change (%)
          </Label>
          <Input
            type="number"
            step="0.1"
            min="-100"
            max="100"
            className="w-24 h-7 text-sm font-mono text-right"
            value={pctDraft}
            onChange={(e) => setPctDraft(e.target.value)}
            onBlur={commitPct}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPct();
            }}
            disabled={!isPctMode}
          />
        </div>
        <Slider
          min={-100}
          max={100}
          step={1}
          value={[isPctMode ? selectedPriceChangePct : Math.round(computedPct)]}
          onValueChange={([val]) => setPriceChangePct(val)}
          disabled={!isPctMode}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-100%</span>
          <span>0%</span>
          <span>+100%</span>
        </div>
      </div>

      {/* Direct price input */}
      <div className="space-y-1.5">
        <Label className={!isDirectMode ? "text-muted-foreground" : ""}>
          Price (per litre)
        </Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="Price per litre"
          value={priceDraft}
          onChange={(e) => setPriceDraft(e.target.value)}
          onBlur={commitPrice}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitPrice();
          }}
          disabled={!isDirectMode}
        />
      </div>
    </div>
  );
}
