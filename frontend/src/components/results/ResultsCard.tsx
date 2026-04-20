import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function Cell({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  const toneClass =
    tone == null || tone === 0
      ? ""
      : tone > 0
      ? "text-green-600"
      : "text-red-600";
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold font-mono ${toneClass}`}>{value}</p>
    </div>
  );
}

function fmt(v: number | null | undefined, digits = 4): string {
  if (v == null) return "N/A";
  return v.toFixed(digits);
}

function fmtVol(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return Math.round(v).toLocaleString();
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;
}

function fmtPctRaw(v: number | null | undefined): string {
  if (v == null) return "N/A";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function ResultsCard({ isLoading }: { isLoading: boolean }) {
  const result = useAppStore((s) => s.simulateResult);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure inputs and run simulation to see results.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { baseline, baseline_elasticity, selected, arc_elasticity } = result;

  // Price row
  const bPrice = baseline?.price_per_litre ?? null;
  const nPrice = selected?.new_price_per_litre ?? null;
  const priceChange = bPrice != null && nPrice != null ? nPrice - bPrice : null;
  const priceChangePct = bPrice != null && nPrice != null && bPrice !== 0
    ? ((nPrice - bPrice) / bPrice) * 100
    : null;

  // Volume row
  const bVol = baseline?.volume_units ?? null;
  const nVol = selected?.predicted_volume_units ?? null;
  const volChange = bVol != null && nVol != null ? nVol - bVol : null;
  const volChangePct = bVol != null && nVol != null && bVol !== 0
    ? (nVol - bVol) / bVol
    : null;

  // Elasticity row
  const bElast = baseline_elasticity;
  const nElast = selected?.elasticity ?? null;
  const elastChange = bElast != null && nElast != null ? nElast - bElast : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3">
          {/* Row 1: Price */}
          <Cell label="Baseline Price" value={fmt(bPrice)} />
          <Cell label="New Price" value={fmt(nPrice)} />
          <Cell label="Price Change" value={priceChange != null ? `${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(4)}` : "N/A"} tone={priceChange} />
          <Cell label="Price Change %" value={priceChangePct != null ? fmtPctRaw(priceChangePct) : "N/A"} tone={priceChangePct} />

          {/* Row 2: Volume */}
          <Cell label="Baseline Volume" value={fmtVol(bVol)} />
          <Cell label="New Volume" value={fmtVol(nVol)} />
          <Cell label="Volume Change" value={volChange != null ? `${volChange >= 0 ? "+" : ""}${Math.round(volChange).toLocaleString()}` : "N/A"} tone={volChange} />
          <Cell label="Volume Change %" value={fmtPct(volChangePct)} tone={volChangePct} />

          {/* Row 3: Elasticity */}
          <Cell label="Baseline Elasticity" value={fmt(bElast)} />
          <Cell label="New Price Elasticity" value={fmt(nElast)} />
          <Cell label="Elasticity Change" value={elastChange != null ? `${elastChange >= 0 ? "+" : ""}${elastChange.toFixed(4)}` : "N/A"} />
          <Cell label="Arc Elasticity" value={fmt(arc_elasticity)} />
        </div>
      </CardContent>
    </Card>
  );
}
