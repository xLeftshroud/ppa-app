import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { CsvUploadZone } from "./CsvUploadZone";
import { useAppStore } from "@/store/useAppStore";
import { renderWithProviders } from "@/test/test-utils";
import { server } from "@/test/msw/server";

const BASE = "http://localhost:8000";

describe("CsvUploadZone", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("uploads a file and updates the store on success", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CsvUploadZone />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["product_sku_code,customer\n1,L2_TESCO"], "sample.csv", { type: "text/csv" });

    await user.upload(input, file);

    await waitFor(() => {
      expect(useAppStore.getState().datasetId).toBe("fake-dataset-id");
    });
    expect(useAppStore.getState().rowCount).toBe(10);
    expect(useAppStore.getState().skuCount).toBe(3);
    expect(screen.getByText(/10 rows/)).toBeInTheDocument();
  });

  it("does not update store when API returns an error", async () => {
    server.use(
      http.post(`${BASE}/v1/datasets/upload`, () =>
        HttpResponse.json(
          {
            error: {
              code: "CSV_SCHEMA_INVALID",
              message: "bad csv",
              details: [],
              request_id: "req-x",
            },
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    renderWithProviders(<CsvUploadZone />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["broken"], "broken.csv", { type: "text/csv" });

    await user.upload(input, file);

    // Wait a tick for the async onDrop handler to settle.
    await new Promise((r) => setTimeout(r, 50));
    expect(useAppStore.getState().datasetId).toBeNull();
  });
});
