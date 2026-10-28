import { pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const currencyEnum = t.pgEnum("currency", ["BRL", "USD"]);

export const accountTable = pgTable("account", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

  name: t.text("name").notNull(),
  initialBalance: t.numeric('initial_balance', { precision: 14, scale: 2 }).notNull().default("0.00"),
  currency: currencyEnum().notNull().default("BRL"),
  isActive: t.boolean("is_active").notNull().default(true),

  userId: t.integer("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),

  createdAt: t.timestamp('created_at', {  withTimezone: true }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', {  withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
},
  (table) => [
    t.unique("accounts_user_id_id_unique").on(table.userId, table.id),
    t.unique("accounts_user_name_unique").on(table.userId, table.name),
    t.index("accounts_user_id_index").on(table.userId),
  ],
);
