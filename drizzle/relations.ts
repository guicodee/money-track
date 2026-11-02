import { relations } from "drizzle-orm/relations";
import { users, account, category, sessions, transactions } from "./schema";

export const accountRelations = relations(account, ({one, many}) => ({
	user: one(users, {
		fields: [account.userId],
		references: [users.id]
	}),
	transactions_accountId: many(transactions, {
		relationName: "transactions_accountId_account_id"
	}),
	transactions_userId: many(transactions, {
		relationName: "transactions_userId_account_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	accounts: many(account),
	categories: many(category),
	sessions: many(sessions),
	transactions: many(transactions),
}));

export const categoryRelations = relations(category, ({one, many}) => ({
	user: one(users, {
		fields: [category.userId],
		references: [users.id]
	}),
	transactions_categoryId: many(transactions, {
		relationName: "transactions_categoryId_category_id"
	}),
	transactions_userId: many(transactions, {
		relationName: "transactions_userId_category_id"
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	account_accountId: one(account, {
		fields: [transactions.accountId],
		references: [account.id],
		relationName: "transactions_accountId_account_id"
	}),
	category_categoryId: one(category, {
		fields: [transactions.categoryId],
		references: [category.id],
		relationName: "transactions_categoryId_category_id"
	}),
	account_userId: one(account, {
		fields: [transactions.userId],
		references: [account.id],
		relationName: "transactions_userId_account_id"
	}),
	category_userId: one(category, {
		fields: [transactions.userId],
		references: [category.id],
		relationName: "transactions_userId_category_id"
	}),
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
}));