import type { VerticalPack } from "./schema.js";

const cache = new Map<string, VerticalPack>();

export function getCachedPack(industry: string): VerticalPack | null {
  return cache.get(industry) ?? null;
}

export function setCachedPack(industry: string, pack: VerticalPack) {
  cache.set(industry, pack);
}
