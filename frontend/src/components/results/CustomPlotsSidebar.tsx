import { useState, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { CustomPlot } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CustomPlotEditModal } from "./CustomPlotEditModal";

const PALETTE = ["#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899", "#14b8a6", "#f43f5e", "#a855f7"];

export function CustomPlotsSidebar() {
  const customPlots = useAppStore((s) => s.customPlots);
  const addCustomPlot = useAppStore((s) => s.addCustomPlot);
  const updateCustomPlot = useAppStore((s) => s.updateCustomPlot);
  const removeCustomPlot = useAppStore((s) => s.removeCustomPlot);

  const [editingPlot, setEditingPlot] = useState<CustomPlot | null>(null);
  const colorRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleAdd = () => {
    const newPlot: CustomPlot = {
      id: crypto.randomUUID(),
      title: `Plot ${customPlots.length + 1}`,
      color: PALETTE[customPlots.length % PALETTE.length],
      isVisible: true,
      columns: ["flavor_internal"],
    };
    addCustomPlot(newPlot);
    setEditingPlot(newPlot);
  };

  const handleColorChange = (id: string, color: string) => {
    updateCustomPlot(id, { color });
  };

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Custom Plots</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAdd} className="h-7 text-xs">
              + Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {customPlots.length === 0 && (
            <p className="text-xs text-muted-foreground">No custom plots yet.</p>
          )}
          {customPlots.map((plot) => (
            <div key={plot.id} className="flex items-center gap-2 py-1 border-b last:border-b-0">
              {/* Color swatch */}
              <button
                className="w-5 h-5 rounded border shrink-0 cursor-pointer"
                style={{ backgroundColor: plot.color }}
                onClick={() => colorRefs.current[plot.id]?.click()}
                title="Change color"
              />
              <input
                ref={(el) => { colorRefs.current[plot.id] = el; }}
                type="color"
                value={plot.color}
                onChange={(e) => handleColorChange(plot.id, e.target.value)}
                className="sr-only"
              />

              {/* Title */}
              <span className="text-xs truncate flex-1 min-w-0" title={plot.title}>
                {plot.title}
              </span>

              {/* Toggle */}
              <Switch
                checked={plot.isVisible}
                onCheckedChange={(v) => updateCustomPlot(plot.id, { isVisible: v })}
                className="scale-[0.6] shrink-0"
              />

              {/* Edit */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-xs shrink-0"
                onClick={() => setEditingPlot(plot)}
                title="Edit"
              >
                E
              </Button>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-xs text-destructive hover:text-destructive shrink-0"
                onClick={() => removeCustomPlot(plot.id)}
                title="Delete"
              >
                X
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {editingPlot && (
        <CustomPlotEditModal
          plot={editingPlot}
          open={!!editingPlot}
          onClose={() => setEditingPlot(null)}
        />
      )}
    </>
  );
}
