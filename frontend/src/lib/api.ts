import { apiBaseUrl } from "./config";

export type ApiError = {
  detail?: {
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("ghartak_token");
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    const message =
      body.detail?.error?.message ??
      body.error?.message ??
      (response.status === 409
        ? "An account already exists with this email or phone."
        : "Something went wrong. Please try again.");
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
