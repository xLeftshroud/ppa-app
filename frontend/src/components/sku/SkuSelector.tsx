import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSkus } from "@/hooks/useCatalog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SkuItem } from "@/types/api";

export function SkuSelector() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const skuAttributes = useAppStore((s) => s.skuAttributes);
  const setSelectedSku = useAppStore((s) => s.setSelectedSku);

  const { data, isLoading } = useSkus(datasetId);
  const items = data?.items ?? [];

  const [search, setSearch] = useState(selectedSku != null ? String(selectedSku) : "");
  const [open, setOpen] = useState(false);

  // Sync search text when selectedSku changes externally (e.g. reset)
  useEffect(() => {
    if (!open) {
      setSearch(selectedSku != null ? String(selectedSku) : "");
    }
  }, [selectedSku, open]);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items by search text (match description or sku code)
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item: SkuItem) =>
        item.material_medium_description.toLowerCase().includes(q) ||
        String(item.product_sku_code).includes(q),
    );
  }, [items, search]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleSelect = (item: SkuItem) => {
    setSelectedSku(item.product_sku_code, item);
    setSearch(String(item.product_sku_code));
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) handleSelect(filtered[highlightIndex]);
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5" ref={containerRef}>
        <Label>Product SKU</Label>
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={isLoading ? "Loading SKUs..." : "Search SKU..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
              // Select all text so user can easily replace or continue editing
              inputRef.current?.select();
            }}
            onKeyDown={handleKeyDown}
            disabled={!datasetId || isLoading}
          />
          {open && (
            <div
              ref={listRef}
              className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-white shadow-md"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">No SKUs found</div>
              ) : (
                filtered.map((item: SkuItem, idx: number) => (
                  <div
                    key={item.product_sku_code}
                    className={`px-3 py-2 text-sm cursor-pointer truncate ${
                      idx === highlightIndex ? "bg-accent text-accent-foreground" : ""
                    } ${item.product_sku_code === selectedSku ? "font-semibold" : ""}`}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent blur before click
                      handleSelect(item);
                    }}
                  >
                    <span className="text-muted-foreground mr-1.5">{item.product_sku_code}</span>
                    {item.material_medium_description}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {skuAttributes && (
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted p-3 rounded-md">
          <div className="col-span-2">
            <span className="text-muted-foreground">Description:</span>{" "}
            <span className="font-medium">{skuAttributes.material_medium_description}</span>
          </div>
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
