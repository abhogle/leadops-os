import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./packages/db/src/schemas/*",
  out: "./packages/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  }
});
