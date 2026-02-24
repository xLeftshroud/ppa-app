import { useAppStore } from "@/store/useAppStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PromotionToggle() {
  const promotionIndicator = useAppStore((s) => s.promotionIndicator);
  const setPromotion = useAppStore((s) => s.setPromotion);

  return (
    <div className="flex items-center justify-between">
      <Label>Promotion</Label>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{promotionIndicator === 1 ? "Yes" : "No"}</span>
        <Switch
          checked={promotionIndicator === 1}
          onCheckedChange={(checked) => setPromotion(checked ? 1 : 0)}
        />
      </div>
    </div>
  );
}
