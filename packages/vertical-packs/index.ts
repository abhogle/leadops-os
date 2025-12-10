import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { VerticalPackSchema, type VerticalPack } from "./schema.js";
import { getCachedPack, setCachedPack } from "./cache.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadVerticalPack(industry: string): VerticalPack {
  // Check cache first
  const cached = getCachedPack(industry);
  if (cached) return cached;

  const root = path.resolve(__dirname, "..");
  const file = path.join(root, industry, "pack.json");

  if (!fs.existsSync(file)) {
    throw new Error(`Vertical pack not found for industry: ${industry}`);
  }

  const raw = fs.readFileSync(file, "utf-8");
  const json = JSON.parse(raw);

  // Validate with Zod
  const parsed = VerticalPackSchema.parse(json);

  // Cache it
  setCachedPack(industry, parsed);

  return parsed;
}

export function listVerticalIndustries(): string[] {
  const root = path.resolve(__dirname, "..");
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      // Only include directories that have a pack.json file
      const packFile = path.join(root, entry.name, "pack.json");
      return fs.existsSync(packFile);
    })
    .map((entry) => entry.name);
}

export { VerticalPackSchema, type VerticalPack } from "./schema.js";
