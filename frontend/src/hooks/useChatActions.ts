import type { UIAction } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import type { SkuItem } from "@/types/api";
import type { CustomPlot } from "@/store/useAppStore";

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
      if (p.baseline_price !== undefined) store.setBaselinePrice(p.baseline_price as number | null);
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
      const {
        id,
        plot_id,
        title,
        columns,
        color,
        is_visible,
      } = action.params as {
        id?: string;
        plot_id?: string;
        title: string;
        columns: string[];
        color: string;
        is_visible?: boolean;
      };
      const resolvedId = plot_id ?? id;
      if (!resolvedId) {
        console.warn("Missing plot id for add_custom_plot action");
        break;
      }
      const plot: CustomPlot = {
        id: resolvedId,
        title,
        color,
        isVisible: is_visible ?? true,
        columns,
      };
      if (store.customPlots.some((existingPlot) => existingPlot.id === resolvedId)) {
        store.updateCustomPlot(resolvedId, plot);
      } else {
        store.addCustomPlot(plot);
      }
      break;
    }
    case "update_custom_plot": {
      const {
        plot_id,
        title,
        columns,
        color,
        is_visible,
      } = action.params as {
        plot_id: string;
        title?: string;
        columns?: string[];
        color?: string;
        is_visible?: boolean;
      };
      const patch: Partial<CustomPlot> = {};
      if (title !== undefined) patch.title = title;
      if (columns !== undefined) patch.columns = columns;
      if (color !== undefined) patch.color = color;
      if (is_visible !== undefined) patch.isVisible = is_visible;
      store.updateCustomPlot(plot_id, patch);
      break;
    }
    case "remove_custom_plot": {
      const { plot_id } = action.params as { plot_id: string };
      store.removeCustomPlot(plot_id);
      break;
    }
    case "clear_custom_plots": {
      store.clearCustomPlots();
      break;
    }
    // trigger_simulation is handled by useChat hook directly
    case "trigger_simulation":
      break;
    default:
      console.warn("Unknown UI action:", action.action);
  }
}
