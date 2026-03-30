import { useState, useRef, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSkus } from "@/hooks/useCatalog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SkuItem } from "@/types/api";

export function SkuSelector() {
  const datasetId = useAppStore((s) => s.datasetId);
  const selectedSku = useAppStore((s) => s.selectedSku);
  const setSelectedSku = useAppStore((s) => s.setSelectedSku);

  const attrBrand = useAppStore((s) => s.attrBrand);
  const attrFlavor = useAppStore((s) => s.attrFlavor);
  const attrPackType = useAppStore((s) => s.attrPackType);
  const attrPackSize = useAppStore((s) => s.attrPackSize);
  const attrUnitsPkg = useAppStore((s) => s.attrUnitsPkg);

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

  // Pre-filter items by non-null attribute values (AND logic)
  const attrFiltered = useMemo(() => {
    return items.filter((item: SkuItem) => {
      if (attrBrand != null && item.top_brand !== attrBrand) return false;
      if (attrFlavor != null && item.flavor_internal !== attrFlavor) return false;
      if (attrPackType != null && item.pack_type_internal !== attrPackType) return false;
      if (attrPackSize != null && item.pack_size_internal !== attrPackSize) return false;
      if (attrUnitsPkg != null && item.units_per_package_internal !== attrUnitsPkg) return false;
      return true;
    });
  }, [items, attrBrand, attrFlavor, attrPackType, attrPackSize, attrUnitsPkg]);

  // Then filter by search text (match description or sku code)
  const filtered = useMemo(() => {
    if (!search.trim()) return attrFiltered;
    const q = search.toLowerCase();
    return attrFiltered.filter(
      (item: SkuItem) =>
        item.material_medium_description.toLowerCase().includes(q) ||
        String(item.product_sku_code).includes(q),
    );
  }, [attrFiltered, search]);

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
                    e.preventDefault();
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
  );
}
