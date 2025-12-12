import { API_BASE_URL } from "../src/config";
import type { z } from "zod";

const API_BASE = API_BASE_URL;

/**
 * Type-safe API GET request with Zod validation
 */
export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  token?: string
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GET ${path} failed with ${res.status}`);
  }

  const data = await res.json();

  try {
    return schema.parse(data);
  } catch (error) {
    console.error(`API response validation failed for ${path}:`, error);
    throw new Error(`Invalid API response format for ${path}`);
  }
}

/**
 * Type-safe API POST request with Zod validation
 */
export async function apiPost<TResponse>(
  path: string,
  body: unknown,
  schema: z.ZodType<TResponse>,
  token?: string
): Promise<TResponse> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`POST ${path} failed with ${res.status}`);
  }

  const data = await res.json();

  try {
    return schema.parse(data);
  } catch (error) {
    console.error(`API response validation failed for ${path}:`, error);
    throw new Error(`Invalid API response format for ${path}`);
  }
}
