import { useAppStore } from "@/store/useAppStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WeekInput() {
  const week = useAppStore((s) => s.week);
  const setWeek = useAppStore((s) => s.setWeek);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 52) {
      setWeek(val);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>Week (1-52)</Label>
      <Input type="number" min={1} max={52} value={week} onChange={handleChange} />
    </div>
  );
}
