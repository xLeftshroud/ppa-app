import type { UIAction } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import type { SkuItem } from "@/types/api";
import type { CustomPlot } from "@/store/useAppStore";

const PLOT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];
let plotCounter = 0;

export function applyUIAction(action: UIAction) {
  const store = useAppStore.getState();

  switch (action.action) {
    case "set_sku": {
      const { sku, attrs } = action.params as { sku: number; attrs: SkuItem | null };
      store.setSelectedSku(sku, attrs ?? null);
      break;
    }
    case "set_customer": {
      store.setCustomer(action.params.customer as string);
      break;
    }
    case "set_simulation_params": {
      const p = action.params;
      if (p.promotion !== undefined) store.setPromotion(p.promotion as 0 | 1);
      if (p.week !== undefined) store.setWeek(p.week as number);
      if (p.baseline_override !== undefined) store.setBaselineOverride(p.baseline_override as number | null);
      if (p.price_change_pct !== undefined) store.setPriceChangePct(p.price_change_pct as number);
      if (p.new_price !== undefined) store.setNewPrice(p.new_price as number | null);
      break;
    }
    case "set_sku_attributes": {
      const p = action.params;
      if (p.brand !== undefined) store.setAttrBrand(p.brand as string | null);
      if (p.flavor !== undefined) store.setAttrFlavor(p.flavor as string | null);
      if (p.pack_type !== undefined) store.setAttrPackType(p.pack_type as string | null);
      if (p.pack_size !== undefined) store.setAttrPackSize(p.pack_size as number | null);
      if (p.units_pkg !== undefined) store.setAttrUnitsPkg(p.units_pkg as number | null);
      break;
    }
    case "clear_selections": {
      store.clearSkuAttrs();
      break;
    }
    case "add_custom_plot": {
      const { title, columns } = action.params as { title: string; columns: string[] };
      const plot: CustomPlot = {
        id: `chat-plot-${Date.now()}-${++plotCounter}`,
        title,
        color: PLOT_COLORS[plotCounter % PLOT_COLORS.length],
        isVisible: true,
        columns,
      };
      store.addCustomPlot(plot);
      break;
    }
    // trigger_simulation is handled by useChat hook directly
    case "trigger_simulation":
      break;
    default:
      console.warn("Unknown UI action:", action.action);
  }
}
