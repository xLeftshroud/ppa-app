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

  // Local draft for editing
  const [draft, setDraft] = useState(displayPrice != null ? String(displayPrice) : "");

  // Sync draft when display price changes externally
  useEffect(() => {
    setDraft(displayPrice != null ? String(displayPrice) : "");
  }, [displayPrice]);

  const handleOverrideToggle = (checked: boolean) => {
    setOverrideEnabled(checked);
    if (!checked) {
      setBaselineOverride(null);
    }
  };

  const commitPrice = () => {
    const val = parseFloat(draft);
    if (!isNaN(val) && val >= 0.01) {
      if (val !== baselineOverride) setBaselineOverride(val);
    } else {
      // Revert to current display value
      setDraft(displayPrice != null ? String(displayPrice) : "");
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
            }}
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
