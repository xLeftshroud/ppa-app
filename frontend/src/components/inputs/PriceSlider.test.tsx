import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceSlider } from "./PriceSlider";
import { useAppStore } from "@/store/useAppStore";
import { renderWithProviders } from "@/test/test-utils";

describe("PriceSlider", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
    useAppStore.getState().setBaselinePrice(1.5);
  });

  it("typing a direct price updates the store on blur", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PriceSlider />);

    const priceInput = screen.getByPlaceholderText(/Price per litre/i) as HTMLInputElement;
    await user.clear(priceInput);
    await user.type(priceInput, "1.80");
    await user.tab();

    expect(useAppStore.getState().selectedNewPrice).toBe(1.8);
  });

  it("switching to percentage mode updates priceInputMode", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PriceSlider />);

    await user.click(screen.getByRole("button", { name: /% Change/i }));
    expect(useAppStore.getState().priceInputMode).toBe("percentage");
  });

  it("typing percentage updates store", async () => {
    const user = userEvent.setup();
    renderWithProviders(<PriceSlider />);
    await user.click(screen.getByRole("button", { name: /% Change/i }));

    // The pct input is the one with step="0.1" (the price input uses step="0.01").
    const pctInput = document.querySelector('input[type="number"][step="0.1"]') as HTMLInputElement;
    expect(pctInput).not.toBeNull();
    await user.clear(pctInput);
    await user.type(pctInput, "25");
    await user.tab();

    expect(useAppStore.getState().selectedPriceChangePct).toBe(25);
  });
});
