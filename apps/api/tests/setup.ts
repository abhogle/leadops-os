import { beforeAll } from "vitest";

beforeAll(() => {
  // Set required environment variables for tests
  process.env.AUTH_SECRET = "test-secret-key-for-testing-only-min-32-chars";
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
  process.env.NODE_ENV = "test";
});
