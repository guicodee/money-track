import { db } from "@src/db";
import { accountTable } from "@src/db/schema/account";
import { categoryTable } from "@src/db/schema/category";
import { transactionsTable } from "@src/db/schema/transactions";
import { usersTable } from "@src/db/schema/users";
import type { CreateTransactionDto, OperationType } from "@src/dto/transaction-dto";
import { count, eq, sql } from "drizzle-orm";

export const PAST = new Date("2020-01-01T03:00:00.000Z");
export const FUTURE = new Date("2999-01-01T03:00:00.000Z");

let seq = 0;

export async function seedUser() {
  const n = ++seq;
  const [user] = await db
    .insert(usersTable)
    .values({ name: `User ${n}`, email: `user${n}@test.com`, password: "hash" })
    .returning();
  return user;
}

export async function seedAccount(
  userId: number,
  o: { initialBalance?: string; isActive?: boolean; name?: string } = {},
) {
  const initialBalance = o.initialBalance ?? "1000.00";
  const [account] = await db
    .insert(accountTable)
    .values({
      userId,
      name: o.name ?? "Principal",
      initialBalance,
      currentBalance: initialBalance,
      isActive: o.isActive ?? true,
    })
    .returning();
  return account;
}

export async function seedCategory(
  userId: number,
  categoryType: "EXPENSE" | "INCOME",
  description = `${categoryType} cat`,
) {
  const [category] = await db
    .insert(categoryTable)
    .values({ userId, categoryType, description })
    .returning();
  return category;
}

interface RawTransaction {
  userId: number;
  accountId: number;
  categoryId: number | null;
  operationType: OperationType;
  amount: string;
  occurredAt: Date;
  appliedAt?: Date | null;
  deletedAt?: Date | null;
}

export async function seedRawTransaction(o: RawTransaction) {
  const [row] = await db
    .insert(transactionsTable)
    .values({ description: "raw", appliedAt: null, deletedAt: null, ...o })
    .returning();
  return row;
}

export async function seedFinancialContext(initialBalance = "1000.00") {
  const user = await seedUser();
  const account = await seedAccount(user.id, { initialBalance });
  const expenseCat = await seedCategory(user.id, "EXPENSE");
  const incomeCat = await seedCategory(user.id, "INCOME");

  const base = { userId: user.id, accountId: account.id, description: "Teste", occurredAt: PAST };
  type Extra = Partial<CreateTransactionDto>;

  return {
    user,
    account,
    expenseCat,
    incomeCat,
    income: (amount: string, o: Extra = {}): CreateTransactionDto => ({
      ...base, operationType: "INCOME", categoryId: incomeCat.id, amount, ...o,
    }),
    expense: (amount: string, o: Extra = {}): CreateTransactionDto => ({
      ...base, operationType: "EXPENSE", categoryId: expenseCat.id, amount, ...o,
    }),
    transfer: (amount: string, o: Extra = {}): CreateTransactionDto => ({
      ...base, operationType: "TRANSFER", categoryId: null, amount, ...o,
    }),
  };
}

export async function getAccount(accountId: number) {
  const [row] = await db.select().from(accountTable).where(eq(accountTable.id, accountId));
  return row as typeof row | undefined;
}

export async function getBalance(accountId: number) {
  return (await getAccount(accountId))!.currentBalance;
}

export async function setActive(accountId: number, isActive: boolean) {
  await db.update(accountTable).set({ isActive }).where(eq(accountTable.id, accountId));
}

export async function countTransactions(accountId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(transactionsTable)
    .where(eq(transactionsTable.accountId, accountId));
  return row.n;
}

export async function expectedBalance(accountId: number) {
  const rows = await db.execute<{ expected: string }>(sql`
    SELECT (a.initial_balance
      + COALESCE(SUM(CASE WHEN t."operationType" = 'INCOME'  THEN t.amount END), 0)
      - COALESCE(SUM(CASE WHEN t."operationType" = 'EXPENSE' THEN t.amount END), 0)
    )::numeric(14,2)::text AS expected
    FROM account a
    LEFT JOIN transactions t
      ON t.account_id = a.id AND t.applied_at IS NOT NULL AND t.deleted_at IS NULL
    WHERE a.id = ${accountId}
    GROUP BY a.id`);
  return [...rows][0].expected;
}

export async function balanceMatchesAudit(accountId: number) {
  return { stored: await getBalance(accountId), audited: await expectedBalance(accountId) };
}

export function pgCode(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code ?? e?.cause?.code;
}

export async function rejectionCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return pgCode(error);
  }
  return "NO_ERROR";
}