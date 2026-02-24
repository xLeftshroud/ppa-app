import ReactECharts from "echarts-for-react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CurvePoint } from "@/types/api";

export function DemandCurveChart({ isLoading }: { isLoading: boolean }) {
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
        return [
          `<strong>Price:</strong> ${price.toFixed(4)}`,
          `<strong>Volume:</strong> ${Math.round(volume).toLocaleString()}`,
          `<strong>Change:</strong> ${pct > 0 ? "+" : ""}${pct}%`,
          `<strong>Elasticity:</strong> ${selected.elasticity.toFixed(4)}`,
        ].join("<br/>");
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: 350 }} />
      </CardContent>
    </Card>
  );
}
