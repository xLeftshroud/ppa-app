import { useAppStore } from "@/store/useAppStore";
import { useSkus } from "@/hooks/useCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { SkuItem } from "@/types/api";

export function SkuSelector() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const skuAttributes = useAppStore((s) => s.skuAttributes);
  const setSelectedSku = useAppStore((s) => s.setSelectedSku);

  const { data, isLoading } = useSkus(datasetId);
  const items = data?.items ?? [];

  const handleSelect = (value: string) => {
    const skuCode = parseInt(value, 10);
    const item = items.find((i: SkuItem) => i.product_sku_code === skuCode) ?? null;
    setSelectedSku(skuCode, item);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Product SKU</Label>
        <Select
          value={selectedSku != null ? String(selectedSku) : ""}
          onValueChange={handleSelect}
          disabled={!datasetId || isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? "Loading SKUs..." : "Select SKU"} />
          </SelectTrigger>
          <SelectContent>
            {items.map((item: SkuItem) => (
              <SelectItem key={item.product_sku_code} value={String(item.product_sku_code)}>
                {item.product_sku_code} - {item.top_brand} {item.flavor_internal}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {skuAttributes && (
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted p-3 rounded-md">
          <div>
            <span className="text-muted-foreground">Brand:</span>{" "}
            <span className="font-medium">{skuAttributes.top_brand}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Flavor:</span>{" "}
            <span className="font-medium">{skuAttributes.flavor_internal}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pack Type:</span>{" "}
            <span className="font-medium">{skuAttributes.pack_type_internal}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pack Size:</span>{" "}
            <span className="font-medium">{skuAttributes.pack_size_internal}ml</span>
          </div>
          <div>
            <span className="text-muted-foreground">Units/Pkg:</span>{" "}
            <span className="font-medium">{skuAttributes.units_per_package_internal}</span>
          </div>
        </div>
      )}
    </div>
  );
}
