import { useAppStore } from "@/store/useAppStore";
import { useCustomers } from "@/hooks/useCatalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function CustomerSelect() {
  const selectedCustomer = useAppStore((s) => s.selectedCustomer);
  const setCustomer = useAppStore((s) => s.setCustomer);
  const { data: customers = [] } = useCustomers();

  return (
    <div className="space-y-1.5">
      <Label>Customer</Label>
      <Select value={selectedCustomer ?? ""} onValueChange={setCustomer}>
        <SelectTrigger>
          <SelectValue placeholder="Select customer" />
        </SelectTrigger>
        <SelectContent>
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
