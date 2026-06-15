import { apiBaseUrl } from "./config";

export type ApiError = {
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
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError;
    throw new Error(body.error?.message ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}
