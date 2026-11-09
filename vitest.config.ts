
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { loadTestEnv } from "./src/tests/setup/env.ts";

const alias = {
  "@src": fileURLToPath(new URL("./src", import.meta.url)),
};

const unitEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://unused:unused@localhost:1/unused_test",
  JWT_SECRET: "test-secret-not-for-production",
  JWT_ACCESS_EXPIRES: "15m",
  JWT_REFRESH_EXPIRES: "7d",
};

export default defineConfig({
  resolve: { alias },

  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/tests/unit/**/*.test.ts"],
          environment: "node",
          env: unitEnv,
          clearMocks: true,
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/tests/integration/**/*.test.ts"],
          environment: "node",
          env: loadTestEnv(),
          globalSetup: ["./src/tests/setup/global-setup.ts"],
          testTimeout: 15_000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "e2e",
          include: ["src/tests/e2e/**/*.test.ts"],
          environment: "node",
          env: loadTestEnv(),
          globalSetup: ["src/tests/setup/global-setup.ts"],
          testTimeout: 20_000,
        },
      },
    ],
  },
});
