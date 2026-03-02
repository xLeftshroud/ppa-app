import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import type { CustomPlot } from "@/store/useAppStore";

const PLOT_COLUMNS = [
  { value: "product_sku_code", label: "Product SKU Code" },
  { value: "customer", label: "Customer" },
  { value: "top_brand", label: "Top Brand" },
  { value: "flavor_internal", label: "Flavor" },
  { value: "pack_type_internal", label: "Pack Type" },
  { value: "pack_size_internal", label: "Pack Size" },
  { value: "units_per_package_internal", label: "Units per Package" },
  { value: "promotion_indicator", label: "Promotion Indicator" },
];

interface Props {
  plot: CustomPlot;
  open: boolean;
  onClose: () => void;
}

export function CustomPlotEditModal({ plot, open, onClose }: Props) {
  const updateCustomPlot = useAppStore((s) => s.updateCustomPlot);
  const [title, setTitle] = useState(plot.title);
  const [columns, setColumns] = useState<string[]>(plot.columns);

  useEffect(() => {
    if (open) {
      setTitle(plot.title);
      setColumns([...plot.columns]);
    }
  }, [open, plot.title, plot.columns]);

  const handleColumnChange = (index: number, value: string) => {
    setColumns((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddColumn = () => {
    const available = PLOT_COLUMNS.filter((c) => !columns.includes(c.value));
    if (available.length > 0) {
      setColumns((prev) => [...prev, available[0].value]);
    }
  };

  const handleSave = () => {
    updateCustomPlot(plot.id, { title: title.trim() || plot.title, columns });
    onClose();
  };

  const availableForIndex = (index: number) =>
    PLOT_COLUMNS.filter((c) => c.value === columns[index] || !columns.includes(c.value));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Custom Plot</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plot Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Plot name" />
          </div>

          <div className="space-y-2">
            <Label>Filter Columns</Label>
            <p className="text-xs text-muted-foreground">
              Rows matching the current SKU's values for these columns will be shown as scatter points.
            </p>
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={col} onValueChange={(v) => handleColumnChange(i, v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForIndex(i).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveColumn(i)}
                  disabled={columns.length <= 1}
                  className="text-destructive hover:text-destructive shrink-0"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              disabled={columns.length >= PLOT_COLUMNS.length}
              className="w-full"
            >
              + Add Column
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
