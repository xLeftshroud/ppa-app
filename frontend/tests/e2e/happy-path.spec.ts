import { test, expect } from "@playwright/test";

test("select SKU → set prices → verify change colors", async ({ page }) => {
  await page.goto("/");

  // 1. Wait for catalog to load — "Product SKU" label appears when SkuSelector mounts
  await expect(page.getByText("Product SKU")).toBeVisible({ timeout: 15_000 });

  // 2. Pick a known SKU from the server-side dataset
  //    414197 FANTA 330ml x 8 is present in backend/data/train_dataset_v3.csv for L2_MORRISONS
  const skuInput = page.getByPlaceholder(/Search SKU/);
  await skuInput.click();
  await skuInput.fill("414197");
  // Wait for dropdown option to render, then click it
  await page.getByText("330MLCAN 3X8P FANTA ORG").first().click();

  // 3. Select customer L2_MORRISONS via shadcn/radix select trigger
  await page.getByTestId("customer-select-trigger").click();
  await page.getByRole("option", { name: "L2_MORRISONS" }).click();

  // 3b. Set week — Week input has placeholder "None" and is the only number input in that section
  const weekInput = page.locator('input[placeholder="None"]').first();
  await weekInput.fill("25");
  await weekInput.press("Tab");

  // 4. Set baseline price
  const baselineInput = page.getByPlaceholder("Enter baseline price");
  await baselineInput.click();
  await baselineInput.fill("1.50");
  await baselineInput.press("Enter");

  // 5. Switch to Direct Price mode and set selected price higher than baseline
  await page.getByRole("button", { name: "Direct Price" }).click();
  const priceInput = page.getByPlaceholder("Price per litre");
  await priceInput.click();
  await priceInput.fill("1.80");
  await priceInput.press("Enter");

  // 6. Run simulation (auto-debounced, but click to be explicit)
  await page.getByRole("button", { name: /Run Simulation|Simulating/ }).click();

  // 7. Wait for results: Price Change cell populated with a non-N/A value
  const priceChange = page.getByTestId("price-change");
  await expect(priceChange).toHaveText(/\+0\.3/, { timeout: 15_000 });

  // 8. Price went up (+) → green tone; Volume went down (-) → red tone
  await expect(priceChange).toHaveClass(/text-green-600/);
  await expect(page.getByTestId("price-change-pct")).toHaveClass(/text-green-600/);
  await expect(page.getByTestId("volume-change")).toHaveClass(/text-red-600/);
  await expect(page.getByTestId("volume-change-pct")).toHaveClass(/text-red-600/);

  // 9. Now flip: raise baseline above selected → Price change negative
  await baselineInput.click();
  await baselineInput.fill("2.00");
  await baselineInput.press("Enter");
  await page.getByRole("button", { name: /Run Simulation|Simulating/ }).click();

  await expect(priceChange).toHaveText(/-0\.2/, { timeout: 15_000 });
  await expect(priceChange).toHaveClass(/text-red-600/);
  await expect(page.getByTestId("volume-change")).toHaveClass(/text-green-600/);
});
