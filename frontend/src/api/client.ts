import type { ApiErrorBody } from "@/types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: unknown[],
    public request_id: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data.error) {
        const err = data.error as ApiErrorBody;
        throw new ApiError(err.code, err.message, err.details ?? [], err.request_id);
      }
    }
    throw new ApiError("UNKNOWN_ERROR", `Request failed: ${res.status}`, [], "");
  }

  return res.json() as Promise<T>;
}
