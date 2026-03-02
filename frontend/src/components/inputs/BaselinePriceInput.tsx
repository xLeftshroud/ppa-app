import { useAppStore } from "@/store/useAppStore";
import { useBaseline } from "@/hooks/useBaseline";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

export function BaselinePriceInput() {
  const baseline = useAppStore((s) => s.baseline);
  const baselineOverride = useAppStore((s) => s.baselineOverride);
  const setBaselineOverride = useAppStore((s) => s.setBaselineOverride);
  const [overrideEnabled, setOverrideEnabled] = useState(false);

  const { isLoading, error, is404 } = useBaseline();

  // Auto-enable override mode when baseline is not found
  useEffect(() => {
    if (is404) {
      setOverrideEnabled(true);
    }
  }, [is404]);

  const displayPrice = baselineOverride ?? baseline?.price_per_litre ?? null;

  const handleOverrideToggle = (checked: boolean) => {
    setOverrideEnabled(checked);
    if (!checked) {
      setBaselineOverride(null);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0.01) {
      setBaselineOverride(val);
    }
  };

  // Non-404 errors are real errors
  const hasRealError = error && !is404;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>Baseline Price (per litre)</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Override</span>
          <Switch
            checked={overrideEnabled}
            onCheckedChange={handleOverrideToggle}
            className="scale-75"
            disabled={is404}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-10 bg-muted animate-pulse rounded-md" />
      ) : hasRealError ? (
        <p className="text-xs text-destructive">Baseline not available</p>
      ) : (
        <>
          {is404 && (
            <p className="text-xs text-amber-600">
              No baseline found for this SKU + customer. Enter a price manually.
            </p>
          )}
          <Input
            type="number"
            step="0.01"
            min="0.01"
            value={displayPrice ?? ""}
            onChange={handlePriceChange}
            disabled={!overrideEnabled}
            placeholder={baseline ? String(baseline.price_per_litre) : "Enter baseline price"}
          />
        </>
      )}

      {baseline && (
        <p className="text-xs text-muted-foreground">
          Baseline volume: {baseline.volume_units.toLocaleString()} units (week {baseline.yearweek})
        </p>
      )}
    </div>
  );
}
