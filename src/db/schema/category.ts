import { pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const categoryTypeEnum = t.pgEnum("categoryType", ["EXPENSE", "INCOME"]);

export const categoryTable = pgTable("category", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

  description: t.text("description").notNull(),
  categoryType: categoryTypeEnum().notNull().default("INCOME"),

  userId: t.integer("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),

  createdAt: t.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
},
  (table) => [
    t.unique("categories_user_id_id_unique").on(table.userId, table.id),
    t.unique("categories_user_name_type_unique").on(
      table.userId,
      table.description,
      table.categoryType,
    ),
    t.index("categories_user_id_index").on(table.userId),
  ],
);
