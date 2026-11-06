import { db } from "@src/db";
import { sql } from "drizzle-orm";

export async function resetDatabase() {
  const rows = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = [...rows].map((r) => `"${r.tablename}"`);
  if (tables.length > 0) {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
  }
}