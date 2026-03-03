import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PriceSlider() {
  const selectedPriceChangePct = useAppStore((s) => s.selectedPriceChangePct);
  const selectedNewPrice = useAppStore((s) => s.selectedNewPrice);
  const baseline = useAppStore((s) => s.baseline);
  const baselineOverride = useAppStore((s) => s.baselineOverride);
  const setPriceChangePct = useAppStore((s) => s.setPriceChangePct);
  const setNewPrice = useAppStore((s) => s.setNewPrice);

  const basePrice = baselineOverride ?? baseline?.price_per_litre ?? 0;
  const hasBasePrice = basePrice > 0;
  const computedPrice = selectedNewPrice ?? (hasBasePrice ? Math.max(0.01, basePrice * (1 + selectedPriceChangePct / 100)) : 0);

  // Local draft for the direct price input
  const [priceDraft, setPriceDraft] = useState(selectedNewPrice != null ? String(selectedNewPrice) : "");

  // Sync draft when store value changes externally (e.g. slider moved)
  useEffect(() => {
    setPriceDraft(selectedNewPrice != null ? String(selectedNewPrice) : "");
  }, [selectedNewPrice]);

  const commitPrice = () => {
    if (priceDraft === "") {
      setNewPrice(null);
    } else {
      const num = parseFloat(priceDraft);
      if (!isNaN(num) && num >= 0.01) {
        setNewPrice(num);
      } else {
        // Revert to current store value
        setPriceDraft(selectedNewPrice != null ? String(selectedNewPrice) : "");
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className={!hasBasePrice ? "text-muted-foreground" : ""}>Price Change (%)</Label>
          <span className="text-sm font-mono">
            {selectedPriceChangePct > 0 ? "+" : ""}
            {selectedPriceChangePct}%
          </span>
        </div>
        <Slider
          min={-100}
          max={100}
          step={1}
          value={[selectedPriceChangePct]}
          onValueChange={([val]) => setPriceChangePct(val)}
          disabled={!hasBasePrice}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>-100%</span>
          <span>0%</span>
          <span>+100%</span>
        </div>
        {!hasBasePrice && (
          <p className="text-xs text-amber-600">
            Set a baseline price or enter price directly below.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{hasBasePrice ? "Or enter price directly" : "Enter price directly"}</Label>
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
        />
      </div>

      {basePrice > 0 && (
        <p className="text-xs text-muted-foreground">
          Effective price: <span className="font-mono font-medium">{computedPrice.toFixed(4)}</span>
        </p>
      )}
    </div>
  );
}
