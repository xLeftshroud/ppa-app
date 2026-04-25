import { useAppStore } from "@/store/useAppStore";
import { useHistoricalPrice } from "@/hooks/useHistoricalPrice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

export function BaselinePriceInput() {
  const historicalPrice = useAppStore((s) => s.historicalPrice);
  const baselinePrice = useAppStore((s) => s.baselinePrice);
  const setBaselinePrice = useAppStore((s) => s.setBaselinePrice);

  const { isLoading, error, is404 } = useHistoricalPrice();

  // Local draft for editing
  const [draft, setDraft] = useState(baselinePrice != null ? String(baselinePrice) : "");

  // Sync draft when baselinePrice changes externally (e.g. auto-populated from historical)
  useEffect(() => {
    setDraft(baselinePrice != null ? String(baselinePrice) : "");
  }, [baselinePrice]);

  const commitPrice = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (baselinePrice !== null) setBaselinePrice(null);
      return;
    }
    const val = parseFloat(trimmed);
    if (!isNaN(val) && val >= 0.01) {
      if (val !== baselinePrice) setBaselinePrice(val);
    } else {
      // Revert to current value
      setDraft(baselinePrice != null ? String(baselinePrice) : "");
    }
  };

  // Non-404 errors are real errors
  const hasRealError = error && !is404;

  return (
    <div className="space-y-1.5">
      <Label>Baseline Price (per litre)</Label>

      {isLoading ? (
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      ) : hasRealError ? (
        <p className="text-xs text-destructive">Historical price not available</p>
      ) : (
        <>
          {is404 && (
            <p className="text-xs text-amber-600">
              No historical data found for this SKU + customer. Enter a price manually.
            </p>
          )}
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
            }}
            placeholder="Enter baseline price"
          />
        </>
      )}

      {historicalPrice && (
        <p className="text-xs text-muted-foreground">
          Historical: {historicalPrice.price_per_litre.toFixed(4)} / {historicalPrice.volume_units.toLocaleString()} L (week {historicalPrice.yearweek})
        </p>
      )}
    </div>
  );
}
