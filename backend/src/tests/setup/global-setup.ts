import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { loadTestEnv } from "./env";

export default async function setup() {
  const { DATABASE_URL } = loadTestEnv();

  const dbName = new URL(DATABASE_URL).pathname.slice(1);
  if (!dbName.endsWith("_test")) {
    throw new Error(`Abortado: o banco "${dbName}" não termina com "_test".`);
  }

  const client = postgres(DATABASE_URL, { max: 1, prepare: false });
  try {
    await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
  } finally {
    await client.end();
  }
}