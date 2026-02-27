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

  // Round to exactly 4dp to match curve data precision
  const r4 = (v: number) => Math.round(v * 10000) / 10000;

  // Build boundary line series (on hidden 2nd y-axis) + markArea
  const boundaryLineSeries: object[] = [];
  const shadedAreas: object[][] = [];
  if (priceRange) {
    const prices = curve.map((p: CurvePoint) => p.price_per_litre);
    const minX = Math.min(...prices);
    const maxX = Math.max(...prices);
    const p1 = r4(priceRange.p1);
    const p5 = r4(priceRange.p5);
    const p95 = r4(priceRange.p95);
    const p99 = r4(priceRange.p99);

    // Boundary lines as line series on hidden yAxisIndex:1 (0-1 range = full chart height)
    // This avoids markLine's axis-tick snapping and doesn't distort the main y-axis
    for (const [key, val] of [["P1", p1], ["P5", p5], ["P95", p95], ["P99", p99]]) {
      boundaryLineSeries.push({
        type: "line" as const,
        xAxisIndex: 0,
        yAxisIndex: 1,
        data: [[val, 0], [val, 1]],
        lineStyle: { type: "dashed" as const, color: "#ea580c", width: 1.5 },
        showSymbol: false,
        silent: true,
        tooltip: { show: false },
        endLabel: {
          show: true,
          formatter: `${key}: ${(val as number).toFixed(4)}`,
          fontSize: 10,
          color: "#ea580c",
        },
      });
    }

    const areaStyle = (c: string) => ({ color: c, borderColor: "transparent", borderWidth: 0, opacity: 1 });
    shadedAreas.push(
      [{ xAxis: minX, itemStyle: areaStyle("rgba(239,68,68,0.15)") }, { xAxis: p1 }],
      [{ xAxis: p99, itemStyle: areaStyle("rgba(239,68,68,0.15)") }, { xAxis: maxX }],
    );
    shadedAreas.push(
      [{ xAxis: p1, itemStyle: areaStyle("rgba(249,115,22,0.15)") }, { xAxis: p5 }],
      [{ xAxis: p95, itemStyle: areaStyle("rgba(249,115,22,0.15)") }, { xAxis: p99 }],
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
          `<strong>Change:</strong> ${pct > 0 ? "+" : ""}${pct.toFixed(4)}%`,
          `<strong>Elasticity:</strong> ${selected.elasticity.toFixed(4)}`,
        ];
        if (confidence) {
          const color = getConfidenceColor(confidence);
          lines.push(`<span style="color:${color}"><strong>${confidence}</strong></span>`);
        }
        return lines.join("<br/>");
      },
    },
    grid: { left: 80, right: 20, top: 40, bottom: 70 },
    xAxis: {
      type: "value" as const,
      name: "Price per Litre",
      nameLocation: "middle" as const,
      nameGap: 30,
      axisLabel: { formatter: (v: number) => v.toFixed(4) },
    },
    yAxis: [
      {
        type: "value" as const,
        name: "Volume (units)",
        nameLocation: "middle" as const,
        nameGap: 55,
        scale: true,
        axisLabel: { formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)) },
      },
      // Hidden y-axis for boundary lines (fixed 0-1 range = full chart height)
      {
        type: "value" as const,
        show: false,
        min: 0,
        max: 1,
      },
    ],
    dataZoom: [
      { type: "inside" as const, filterMode: "none" as const, minValueSpan: 0.0005 },
      { type: "slider" as const, bottom: 10, filterMode: "none" as const, minValueSpan: 0.0005 },
    ],
    series: [
      {
        type: "line" as const,
        smooth: false,
        yAxisIndex: 0,
        data: curve.map((p: CurvePoint) => [p.price_per_litre, p.predicted_volume_units]),
        lineStyle: { width: 2, color: "#2563eb" },
        itemStyle: { color: "#2563eb" },
        showSymbol: false,
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
        markArea: shadedAreas.length > 0
          ? { silent: true, animation: false, data: shadedAreas }
          : undefined,
      },
      ...boundaryLineSeries,
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
