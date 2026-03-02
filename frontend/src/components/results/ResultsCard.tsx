import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricProps {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}

function Metric({ label, value, sub, highlight }: MetricProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold font-mono ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function ResultsCard({ isLoading }: { isLoading: boolean }) {
  const result = useAppStore((s) => s.simulateResult);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
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

  const { baseline, selected } = result;
  const deltaColor = selected.delta_volume_units >= 0 ? "text-green-600" : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Results</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Metric label="Baseline Price" value={baseline ? baseline.price_per_litre.toFixed(4) : "N/A"} sub={baseline ? `Week ${baseline.yearweek}` : "No baseline"} />
        <Metric label="Baseline Volume" value={baseline ? baseline.volume_units.toLocaleString() : "N/A"} sub={baseline ? "units" : "No baseline"} />
        <Metric label="New Price" value={`${selected.new_price_per_litre.toFixed(4)}`} sub={`${selected.price_change_pct > 0 ? "+" : ""}${selected.price_change_pct.toFixed(1)}%`} highlight />
        <Metric label="Predicted Volume" value={Math.round(selected.predicted_volume_units).toLocaleString()} sub="units" />
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Volume Change</p>
          <p className={`text-lg font-semibold font-mono ${deltaColor}`}>
            {selected.delta_volume_units >= 0 ? "+" : ""}
            {Math.round(selected.delta_volume_units).toLocaleString()}
          </p>
          <p className={`text-xs ${deltaColor}`}>
            {(selected.delta_volume_pct * 100).toFixed(2)}%
          </p>
        </div>
        <Metric label="Elasticity" value={selected.elasticity.toFixed(4)} />
      </CardContent>
    </Card>
  );
}
