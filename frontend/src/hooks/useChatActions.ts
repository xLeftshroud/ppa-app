import type { UIAction } from "@/store/useChatStore";
import { useAppStore } from "@/store/useAppStore";
import type { SkuItem } from "@/types/api";
import type { CustomPlot } from "@/store/useAppStore";

export function applyUIAction(action: UIAction, skuItems?: SkuItem[]) {
  const store = useAppStore.getState();

  switch (action.action) {
    case "set_sku": {
      const { sku } = action.params as { sku: number };
      const item = skuItems?.find((s) => s.product_sku_code === sku) ?? null;
      store.setSelectedSku(sku, item);
      break;
    }
    case "set_customer": {
      store.setCustomer(action.params.customer as string);
      break;
    }
    // ── Individual simulation param actions ──
    case "set_promotion":
      store.setPromotion(action.params.value as 0 | 1);
      break;
    case "set_week":
      store.setWeek(action.params.value as number);
      break;
    case "set_baseline_price":
      store.setBaselinePrice(action.params.value as number | null);
      break;
    case "set_price_change_pct":
      store.setPriceInputMode("percentage");
      store.setPriceChangePct(action.params.value as number);
      break;
    case "set_new_price":
      store.setPriceInputMode("direct");
      store.setNewPrice(action.params.value as number | null);
      break;
    // ── Individual SKU attribute actions ──
    case "set_brand":
      store.setAttrBrand(action.params.value as string | null);
      break;
    case "set_flavor":
      store.setAttrFlavor(action.params.value as string | null);
      break;
    case "set_pack_type":
      store.setAttrPackType(action.params.value as string | null);
      break;
    case "set_pack_size":
      store.setAttrPackSize(action.params.value as number | null);
      break;
    case "set_units_pkg":
      store.setAttrUnitsPkg(action.params.value as number | null);
      break;
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
