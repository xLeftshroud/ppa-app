import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PriceRange } from "@/types/api";

interface MetricProps {
  label: string;
  value: string | number;
  sub?: string;
}

function Metric({ label, value, sub }: MetricProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold font-mono">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function PriceRangeCard({ priceRange }: { priceRange: PriceRange | null }) {
  if (!priceRange) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Price Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select a SKU to see its training price distribution.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Price Distribution</CardTitle>
          <span className="text-xs text-muted-foreground">n = {priceRange.n.toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="P1" value={priceRange.p1.toFixed(4)} sub="Low boundary" />
        <Metric label="P5" value={priceRange.p5.toFixed(4)} sub="Safe lower" />
        <Metric label="P95" value={priceRange.p95.toFixed(4)} sub="Safe upper" />
        <Metric label="P99" value={priceRange.p99.toFixed(4)} sub="High boundary" />
      </CardContent>
    </Card>
  );
}
