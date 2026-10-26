import { pgTable } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

export const languageEnum = t.pgEnum("language", ["pt", "en"]);

export const usersTable = pgTable("users", {
  id: t.integer().primaryKey().generatedAlwaysAsIdentity(),

  name: t.text("name").notNull(),  
  email: t.text("email").notNull().unique(),
  password: t.text("password").notNull(),
  language: languageEnum().notNull().default("en"),

  createdAt: t.timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: t.timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});
