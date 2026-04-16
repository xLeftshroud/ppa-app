import { useAppStore } from "@/store/useAppStore";
import { useCustomers } from "@/hooks/useCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const NONE_VALUE = "__none__";

export function CustomerSelect() {
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setCustomer = useAppStore((s) => s.setCustomer);
  const { data: customers = [] } = useCustomers();

  return (
    <div className="space-y-1.5">
      <Label>Customer</Label>
      <Select
        value={selectedCustomer ?? NONE_VALUE}
        onValueChange={(v) => setCustomer(v === NONE_VALUE ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">None</span>
          </SelectItem>
          {customers.map((c: string) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
