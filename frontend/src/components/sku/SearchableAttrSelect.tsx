import { useState, useRef, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Props {
  label: string;
  placeholder?: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}

export function SearchableAttrSelect({ label, placeholder, options, value, onChange, disabled }: Props) {
  const [search, setSearch] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync search text when value changes externally
  useEffect(() => {
    if (!open) {
      setSearch(value ?? "");
    }
  }, [value, open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const handleSelect = (val: string) => {
    onChange(val);
    setSearch(val);
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

  const handleBlur = () => {
    // If input text doesn't match an option, clear to null
    if (!open && search && !options.includes(search)) {
      onChange(null);
      setSearch("");
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <Label>{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder={placeholder ?? `Search ${label.toLowerCase()}...`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!e.target.value.trim()) {
              onChange(null);
            }
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            inputRef.current?.select();
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        {open && (
          <div
            ref={listRef}
            className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-white shadow-md"
          >
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            ) : (
              filtered.map((opt, idx) => (
                <div
                  key={opt}
                  className={`px-3 py-2 text-sm cursor-pointer truncate ${
                    idx === highlightIndex ? "bg-accent text-accent-foreground" : ""
                  } ${opt === value ? "font-semibold" : ""}`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
