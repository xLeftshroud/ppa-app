import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  disabled?: boolean;
}

export function NullableNumberInput({ label, value, onChange, min, disabled }: Props) {
  const [draft, setDraft] = useState(value != null ? String(value) : "");

  // Sync draft when store value changes externally
  useEffect(() => {
    setDraft(value != null ? String(value) : "");
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== null) onChange(null);
      return;
    }
    const val = parseInt(trimmed, 10);
    if (!isNaN(val) && (min == null || val >= min)) {
      if (val !== value) onChange(val);
    } else {
      // Revert
      setDraft(value != null ? String(value) : "");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        placeholder="Any"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
        disabled={disabled}
      />
    </div>
  );
}
