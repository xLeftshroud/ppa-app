import ReactECharts from "echarts-for-react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurvePoint, PriceRange } from "@/types/api";

function getConfidenceLabel(price: number, pr: PriceRange | null): string {
  if (!pr) return "";
  if (price < pr.p1 || price > pr.p99) return "Low confidence";
  if (price < pr.p5 || price > pr.p95) return "Medium confidence";
  return "High confidence";
}

function getConfidenceColor(label: string): string {
  if (label === "Low confidence") return "#ef4444";
  if (label === "Medium confidence") return "#f59e0b";
  return "#22c55e";
}

export function DemandCurveChart({
  isLoading,
  priceRange,
}: {
  isLoading: boolean;
  priceRange: PriceRange | null;
}) {
  const result = useAppStore((s) => s.simulateResult);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demand Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demand Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
            Run simulation to see demand curve
          </div>
        </CardContent>
      </Card>
    );
  }

  const { curve, selected, baseline } = result;

  // Build markLine data for boundary lines at p1, p5, p95, p99
  const boundaryLines: object[] = [];
  if (priceRange) {
    const dashed = { type: "dashed" as const, color: "#ea580c", width: 1.5 };
    for (const key of ["p1", "p5", "p95", "p99"] as const) {
      boundaryLines.push({
        xAxis: priceRange[key],
        lineStyle: dashed,
        label: {
          formatter: key.toUpperCase(),
          position: "insideEndTop" as const,
          fontSize: 10,
          color: "#ea580c",
        },
      });
    }
  }

  // Build markArea data for shaded regions
  const shadedAreas: object[][] = [];
  if (priceRange) {
    const prices = curve.map((p: CurvePoint) => p.price_per_litre);
    const minX = Math.min(...prices);
    const maxX = Math.max(...prices);
    // Light red (p99 extreme): [min, p1] and [p99, max]
    shadedAreas.push(
      [{ xAxis: minX, itemStyle: { color: "rgba(239,68,68,0.15)" } }, { xAxis: priceRange.p1 }],
      [{ xAxis: priceRange.p99, itemStyle: { color: "rgba(239,68,68,0.15)" } }, { xAxis: maxX }],
    );
    // Light orange (p5/p95 moderate): [p1, p5] and [p95, p99]
    shadedAreas.push(
      [{ xAxis: priceRange.p1, itemStyle: { color: "rgba(249,115,22,0.15)" } }, { xAxis: priceRange.p5 }],
      [{ xAxis: priceRange.p95, itemStyle: { color: "rgba(249,115,22,0.15)" } }, { xAxis: priceRange.p99 }],
    );
  }

  const option = {
    tooltip: {
      trigger: "axis" as const,
      formatter: (params: { data: number[] }[]) => {
        if (!params[0]) return "";
        const [price, volume] = params[0].data;
        const curvePoint = curve.find(
          (p: CurvePoint) => Math.abs(p.price_per_litre - price) < 0.0001
        );
        const pct = curvePoint?.price_change_pct ?? 0;
        const confidence = getConfidenceLabel(price, priceRange);
        const lines = [
          `<strong>Price:</strong> ${price.toFixed(4)}`,
          `<strong>Volume:</strong> ${Math.round(volume).toLocaleString()}`,
          `<strong>Change:</strong> ${pct > 0 ? "+" : ""}${pct}%`,
          `<strong>Elasticity:</strong> ${selected.elasticity.toFixed(4)}`,
        ];
        if (confidence) {
          const color = getConfidenceColor(confidence);
          lines.push(`<span style="color:${color}"><strong>${confidence}</strong></span>`);
        }
        return lines.join("<br/>");
      },
    },
    grid: { left: 80, right: 30, top: 40, bottom: 70 },
    xAxis: {
      type: "value" as const,
      name: "Price per Litre",
      nameLocation: "middle" as const,
      nameGap: 30,
      axisLabel: { formatter: (v: number) => v.toFixed(2) },
    },
    yAxis: {
      type: "value" as const,
      name: "Volume (units)",
      nameLocation: "middle" as const,
      nameGap: 55,
      scale: true,
      axisLabel: { formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) },
    },
    dataZoom: [
      { type: "inside" as const },
      { type: "slider" as const, bottom: 10 },
    ],
    series: [
      {
        type: "line" as const,
        smooth: true,
        data: curve.map((p: CurvePoint) => [p.price_per_litre, p.predicted_volume_units]),
        lineStyle: { width: 2, color: "#2563eb" },
        itemStyle: { color: "#2563eb" },
        symbolSize: 4,
        markPoint: {
          data: [
            {
              coord: [selected.new_price_per_litre, selected.predicted_volume_units],
              name: "Selected",
              symbol: "circle",
              symbolSize: 14,
              itemStyle: { color: "#ef4444", borderColor: "#fff", borderWidth: 2 },
              label: { show: false },
            },
            {
              coord: [baseline.price_per_litre, baseline.volume_units],
              name: "Baseline",
              symbol: "diamond",
              symbolSize: 12,
              itemStyle: { color: "#22c55e", borderColor: "#fff", borderWidth: 2 },
              label: { show: false },
            },
          ],
          tooltip: {
            formatter: (params: { name: string; data: { coord: number[] } }) => {
              return `<strong>${params.name}</strong><br/>Price: ${params.data.coord[0].toFixed(4)}<br/>Volume: ${Math.round(params.data.coord[1]).toLocaleString()}`;
            },
          },
        },
        markLine: boundaryLines.length > 0
          ? { silent: true, symbol: "none", data: boundaryLines }
          : undefined,
        markArea: shadedAreas.length > 0
          ? { silent: true, data: shadedAreas }
          : undefined,
      },
    ],
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Demand Curve</CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rotate-45 bg-green-500" />
              <span>Baseline</span>
            </div>
            {priceRange && (
              <>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(249,115,22,0.3)" }} />
                  <span>p5–p95</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(239,68,68,0.3)" }} />
                  <span>&lt;p1 / &gt;p99</span>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 350 }} />
      </CardContent>
    </Card>
  );
}
