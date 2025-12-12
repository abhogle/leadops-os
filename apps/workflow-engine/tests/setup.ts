import { beforeAll } from "vitest";

beforeAll(() => {
  // Set required environment variables for tests
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
  process.env.NODE_ENV = "test";
  process.env.REDIS_HOST = process.env.REDIS_HOST || "localhost";
  process.env.REDIS_PORT = process.env.REDIS_PORT || "6379";
});
