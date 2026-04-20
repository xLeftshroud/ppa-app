import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./useAppStore";
import type { SkuItem } from "@/types/api";

const SKU: SkuItem = {
  product_sku_code: 100001,
  material_medium_description: "330MLCAN 3X8P FANTA ORG",
  top_brand: "FANTA",
  flavor_internal: "ORANGE",
  pack_type_internal: "CAN",
  pack_size_internal: 330,
  units_per_package_internal: 8,
};

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("has expected initial state", () => {
    const s = useAppStore.getState();
    expect(s.selectedSku).toBeNull();
    expect(s.promotionIndicator).toBe(0);
    expect(s.priceInputMode).toBe("direct");
    expect(s.customPlots).toEqual([]);
  });

  it("setSelectedSku populates editable attributes from SkuItem", () => {
    useAppStore.getState().setSelectedSku(100001, SKU);
    const s = useAppStore.getState();
    expect(s.selectedSku).toBe(100001);
    expect(s.attrBrand).toBe("FANTA");
    expect(s.attrFlavor).toBe("ORANGE");
    expect(s.attrPackSize).toBe(330);
  });

  it("clearSkuAttrs wipes sku + editable attributes", () => {
    useAppStore.getState().setSelectedSku(100001, SKU);
    useAppStore.getState().clearSkuAttrs();
    const s = useAppStore.getState();
    expect(s.selectedSku).toBeNull();
    expect(s.attrBrand).toBeNull();
    expect(s.attrPackSize).toBeNull();
  });

  it("commitAttrs snapshots editable state", () => {
    useAppStore.getState().setSelectedSku(100001, SKU);
    useAppStore.getState().setCustomer("L2_TESCO");
    useAppStore.getState().commitAttrs();
    const committed = useAppStore.getState().committedAttrs;
    expect(committed).not.toBeNull();
    expect(committed!.selectedSku).toBe(100001);
    expect(committed!.selectedCustomer).toBe("L2_TESCO");
    expect(committed!.attrBrand).toBe("FANTA");
  });

  it("custom plot CRUD", () => {
    const plot = { id: "p1", title: "Test", color: "#f00", isVisible: true, columns: ["a"] };
    useAppStore.getState().addCustomPlot(plot);
    expect(useAppStore.getState().customPlots).toHaveLength(1);

    useAppStore.getState().updateCustomPlot("p1", { title: "Updated" });
    expect(useAppStore.getState().customPlots[0].title).toBe("Updated");

    useAppStore.getState().removeCustomPlot("p1");
    expect(useAppStore.getState().customPlots).toHaveLength(0);
  });

  it("setCustomer clears historical price + cached curve", () => {
    useAppStore.getState().setHistoricalPrice({ yearweek: 1, price_per_litre: 1, volume_units: 1 });
    useAppStore.getState().setCachedCurve([{ price_per_litre: 1, predicted_volume_units: 1 }], "fp");
    useAppStore.getState().setCustomer("L2_TESCO");
    const s = useAppStore.getState();
    expect(s.historicalPrice).toBeNull();
    expect(s.cachedCurve).toBeNull();
  });

  it("reset returns to initial state", () => {
    useAppStore.getState().setSelectedSku(100001, SKU);
    useAppStore.getState().setCustomer("L2_TESCO");
    useAppStore.getState().reset();
    const s = useAppStore.getState();
    expect(s.selectedSku).toBeNull();
    expect(s.selectedCustomer).toBeNull();
  });
});
