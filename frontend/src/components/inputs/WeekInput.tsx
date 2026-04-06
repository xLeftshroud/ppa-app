import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WeekInput() {
  const week = useAppStore((s) => s.week);
  const setWeek = useAppStore((s) => s.setWeek);

  const [draft, setDraft] = useState(week != null ? String(week) : "");

  // Sync draft when store value changes externally
  useEffect(() => {
    setDraft(week != null ? String(week) : "");
  }, [week]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (week !== null) setWeek(null);
      return;
    }
    const val = parseInt(trimmed, 10);
    if (!isNaN(val) && val >= 1 && val <= 52) {
      if (val !== week) setWeek(val);
    } else {
      // Revert to current store value
      setDraft(week != null ? String(week) : "");
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Week (1-52)</Label>
      <Input
        type="number"
        min={1}
        max={52}
        placeholder="None"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
        }}
      />
    </div>
  );
}
