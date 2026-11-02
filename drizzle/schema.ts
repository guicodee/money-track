import { pgTable, index, foreignKey, unique, integer, text, numeric, boolean, timestamp, check, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const categoryType = pgEnum("categoryType", ['EXPENSE', 'INCOME'])
export const currency = pgEnum("currency", ['BRL', 'USD'])
export const language = pgEnum("language", ['pt', 'en'])
export const operationType = pgEnum("operationType", ['EXPENSE', 'INCOME', 'TRANSFER'])


export const account = pgTable("account", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "account_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	initialBalance: numeric("initial_balance", { precision: 14, scale:  2 }).default('0.00').notNull(),
	currency: currency().default('BRL').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	currentBalance: numeric("current_balance", { precision: 14, scale:  2 }).default('0.00').notNull(),
}, (table) => [
	index("accounts_user_id_index").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "account_user_id_users_id_fk"
		}).onDelete("restrict"),
	unique("accounts_user_id_id_unique").on(table.id, table.userId),
	unique("accounts_user_name_unique").on(table.name, table.userId),
]);

export const users = pgTable("users", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "users_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	name: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	language: language().default('en').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const category = pgTable("category", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "category_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	description: text().notNull(),
	categoryType: categoryType().default('INCOME').notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("categories_user_id_index").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "category_user_id_users_id_fk"
		}).onDelete("restrict"),
	unique("categories_user_id_id_unique").on(table.id, table.userId),
	unique("categories_user_name_type_unique").on(table.description, table.categoryType, table.userId),
]);

export const sessions = pgTable("sessions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "sessions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	refreshTokenHash: text("refresh_token_hash").notNull(),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	revokedAt: timestamp("revoked_at", { withTimezone: true, mode: 'string' }),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index().using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
	index().using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("sessions_refresh_token_hash_unique").on(table.refreshTokenHash),
]);

export const transactions = pgTable("transactions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity({ name: "transactions_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 2147483647, cache: 1 }),
	description: text().notNull(),
	amount: numeric({ precision: 14, scale:  2 }).notNull(),
	operationType: operationType().default('INCOME').notNull(),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).notNull(),
	userId: integer("user_id").notNull(),
	accountId: integer("account_id").notNull(),
	categoryId: integer("category_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	appliedAt: timestamp("applied_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("transactions_pending_index").using("btree", table.occurredAt.asc().nullsLast().op("timestamptz_ops")).where(sql`((deleted_at IS NULL) AND (applied_at IS NULL) AND ("operationType" <> 'TRANSFER'::"operationType"))`),
	index("transactions_user_account_date_index").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.accountId.asc().nullsLast().op("timestamptz_ops"), table.occurredAt.asc().nullsLast().op("int4_ops")),
	index("transactions_user_category_date_index").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.categoryId.asc().nullsLast().op("int4_ops"), table.occurredAt.asc().nullsLast().op("timestamptz_ops")),
	index("transactions_user_occurred_at_index").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.occurredAt.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.accountId],
			foreignColumns: [account.id],
			name: "transactions_account_id_account_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [category.id],
			name: "transactions_category_id_category_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.userId, table.accountId],
			foreignColumns: [account.id, account.userId],
			name: "transactions_user_account_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.userId, table.categoryId],
			foreignColumns: [category.id, category.userId],
			name: "transactions_user_category_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "transactions_user_id_users_id_fk"
		}).onDelete("restrict"),
	check("transactions_amount_positive", sql`amount > (0)::numeric`),
	check("transactions_deleted_not_applied", sql`(deleted_at IS NULL) OR (applied_at IS NULL)`),
	check("transactions_transfer_not_applied", sql`("operationType" <> 'TRANSFER'::"operationType") OR (applied_at IS NULL)`),
	check("transactions_transfer_rules", sql`(("operationType" = 'TRANSFER'::"operationType") AND (category_id IS NULL)) OR (("operationType" <> 'TRANSFER'::"operationType") AND (category_id IS NOT NULL))`),
]);
