import { pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { categoryTable } from "./category";
import { accountTable } from "./account";
import { sql } from "drizzle-orm";

export const operationTypeEnum = t.pgEnum("operationType", ["EXPENSE", "INCOME", "TRANSFER"]);

export const transactionsTable = pgTable("transactions", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

  description: t.text("description").notNull(),
  amount: t.numeric('amount', { precision: 14, scale: 2 }).notNull(),
  operationType: operationTypeEnum().notNull().default("INCOME"),
  occurredAt: t.timestamp("occurred_at", { withTimezone: true }).notNull(),

  userId: t.integer("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  accountId: t.integer("account_id").notNull().references(() => accountTable.id, { onDelete: "restrict" }),
  categoryId: t.integer("category_id").references(() => categoryTable.id, { onDelete: "restrict" }),

  createdAt: t.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
},
  (table) => [
    t.foreignKey({
      name: "transactions_user_account_fk",
      columns: [table.userId, table.accountId],
      foreignColumns: [accountTable.userId, accountTable.id],
    }).onDelete("restrict"),

    t.foreignKey({
      name: "transactions_user_category_fk",
      columns: [table.userId, table.categoryId],
      foreignColumns: [categoryTable.userId, categoryTable.id],
    }).onDelete("restrict"),

    t.check(
      "transactions_amount_positive",
      sql`${table.amount} > 0`,
    ),

    t.check(
      "transactions_transfer_rules",
      sql`(
        (
          ${table.operationType} = 'TRANSFER'
          AND ${table.categoryId} IS NULL
        )
        OR
        (
          ${table.operationType} <> 'TRANSFER'
          AND ${table.categoryId} IS NOT NULL
        )
      )`,
    ),

    t.index("transactions_user_occurred_at_index").on(
      table.userId,
      table.occurredAt,
    ),

    t.index("transactions_user_account_date_index").on(
      table.userId,
      table.accountId,
      table.occurredAt,
    ),

    t.index("transactions_user_category_date_index").on(
      table.userId,
      table.categoryId,
      table.occurredAt,
    ),
  ],
);
