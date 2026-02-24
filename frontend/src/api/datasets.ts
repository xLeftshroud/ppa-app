import { apiFetch } from "./client";
import type { UploadResponse } from "@/types/api";

export async function uploadDataset(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<UploadResponse>("/v1/datasets/upload", {
    method: "POST",
    body: formData,
  });
}
