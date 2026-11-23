import { pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sessionsTable = pgTable("sessions", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

  refreshTokenHash: t.text("refresh_token_hash").notNull().unique(),

  userAgent: t.text("user_agent"),
  ipAddress: t.text("ip_address"),

  expiresAt: t.timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: t.timestamp("revoked_at", { withTimezone: true }),
  
  userId: t.integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  createdAt: t.timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    t.index("sessions_user_id_index").on(table.userId),
    t.index("sessions_expires_at_index").on(table.expiresAt),
  ]
);