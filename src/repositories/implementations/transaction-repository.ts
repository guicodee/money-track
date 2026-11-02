import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@src/db";
import { accountTable } from "@src/db/schema/account";
import { categoryTable } from "@src/db/schema/category";
import { transactionsTable } from "@src/db/schema/transactions";
import type {
  CreateTransactionDto,
  ListTransactionsRepositoryDto,
  ListTransactionsResultDto,
  OperationType,
  TransactionAccountDto,
  TransactionDto,
  UpdateTransactionDataDto,
} from "@src/dto/transaction-dto";
import type { ITransactionRepository } from "../interfaces/transaction-repostory-interface";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DetailRow = Omit<TransactionDto, "status"> & { appliedAt: Date | null };

const detailColumns = {
  id: transactionsTable.id,
  description: transactionsTable.description,
  amount: transactionsTable.amount,
  operationType: transactionsTable.operationType,
  occurredAt: transactionsTable.occurredAt,
  appliedAt: transactionsTable.appliedAt,
  createdAt: transactionsTable.createdAt,
  updatedAt: transactionsTable.updatedAt,
  account: {
    id: accountTable.id,
    name: accountTable.name,
    isActive: accountTable.isActive,
  },
  category: {
    id: categoryTable.id,
    description: categoryTable.description,
    categoryType: categoryTable.categoryType,
  },
};

function signedAmount(operationType: OperationType, amount: string): string | null {
  if (operationType === "INCOME") return amount;
  if (operationType === "EXPENSE") return `-${amount}`;
  return null; 
}

function negate(delta: string): string {
  return delta.startsWith("-") ? delta.slice(1) : `-${delta}`;
}

async function addToBalance(tx: Tx, accountId: number, userId: number, delta: string) {
  await tx
    .update(accountTable)
    .set({ currentBalance: sql`${accountTable.currentBalance} + ${delta}::numeric` })
    .where(and(eq(accountTable.id, accountId), eq(accountTable.userId, userId)));
}

function toDto({ appliedAt, ...row }: DetailRow): TransactionDto {
  const status =
    row.operationType === "TRANSFER" ? null : appliedAt ? "EFFECTIVE" : "PENDING";
  return { ...row, status };
}

export class TransactionRepository implements ITransactionRepository {
  private selectDetail() {
    return db
      .select(detailColumns)
      .from(transactionsTable)
      .innerJoin(accountTable, eq(accountTable.id, transactionsTable.accountId))
      .leftJoin(categoryTable, eq(categoryTable.id, transactionsTable.categoryId));
  }

  async findAccount(accountId: number, userId: number): Promise<TransactionAccountDto | null> {
    const [account] = await db
      .select({ id: accountTable.id, isActive: accountTable.isActive })
      .from(accountTable)
      .where(and(eq(accountTable.id, accountId), eq(accountTable.userId, userId)))
      .limit(1);
    return account ?? null;
  }

  async create(data: CreateTransactionDto): Promise<TransactionDto> {
    const id = await db.transaction(async (tx) => {
      const now = new Date();
      const delta = signedAmount(data.operationType, data.amount);
      const applied = delta !== null && data.occurredAt.getTime() <= now.getTime();

      const [row] = await tx
        .insert(transactionsTable)
        .values({ ...data, appliedAt: applied ? now : null })
        .returning({ id: transactionsTable.id });

      if (applied) await addToBalance(tx, data.accountId, data.userId, delta);
      return row.id;
    });

    return (await this.findById(id, data.userId))!;
  }

  async findById(id: number, userId: number): Promise<TransactionDto | null> {
    const [row] = await this.selectDetail()
      .where(
        and(
          eq(transactionsTable.id, id),
          eq(transactionsTable.userId, userId),
          isNull(transactionsTable.deletedAt),
        ),
      )
      .limit(1);
    return row ? toDto(row) : null;
  }

  async list(params: ListTransactionsRepositoryDto): Promise<ListTransactionsResultDto> {
    const { userId, type, accountId, categoryId, from, to, limit, offset } = params;

    const where = and(
      eq(transactionsTable.userId, userId),
      isNull(transactionsTable.deletedAt),
      type ? eq(transactionsTable.operationType, type) : undefined,
      accountId ? eq(transactionsTable.accountId, accountId) : undefined,
      categoryId ? eq(transactionsTable.categoryId, categoryId) : undefined,
      from ? gte(transactionsTable.occurredAt, from) : undefined,
      to ? lt(transactionsTable.occurredAt, to) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.selectDetail()
        .where(where)
        .orderBy(desc(transactionsTable.occurredAt), desc(transactionsTable.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(transactionsTable).where(where),
    ]);

    return { items: rows.map(toDto), total };
  }

  async update(
    id: number,
    userId: number,
    data: UpdateTransactionDataDto,
  ): Promise<TransactionDto | null> {
    const found = await db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.id, id),
            eq(transactionsTable.userId, userId),
            isNull(transactionsTable.deletedAt),
          ),
        )
        .for("update");
      if (!current) return false;

      const now = new Date();
      const operationType = data.operationType ?? current.operationType;
      const amount = data.amount ?? current.amount;
      const occurredAt = data.occurredAt ?? current.occurredAt;
      const accountId = data.accountId ?? current.accountId;

      const newDelta = signedAmount(operationType, amount);
      const shouldBeApplied = newDelta !== null && occurredAt.getTime() <= now.getTime();
      const oldDelta = current.appliedAt
        ? signedAmount(current.operationType, current.amount)
        : null;
      const effectiveNewDelta = shouldBeApplied ? newDelta : null;

      if (oldDelta !== effectiveNewDelta || current.accountId !== accountId) {
        const adjustments: { accountId: number; delta: string }[] = [];
        if (oldDelta) adjustments.push({ accountId: current.accountId, delta: negate(oldDelta) });
        if (effectiveNewDelta) adjustments.push({ accountId, delta: effectiveNewDelta });

        adjustments.sort((a, b) => a.accountId - b.accountId);
        for (const adj of adjustments) {
          await addToBalance(tx, adj.accountId, userId, adj.delta);
        }
      }

      await tx
        .update(transactionsTable)
        .set({
          description: data.description,
          amount: data.amount,
          operationType: data.operationType,
          occurredAt: data.occurredAt,
          accountId: data.accountId,
          categoryId: data.categoryId,
          appliedAt: shouldBeApplied ? (current.appliedAt ?? now) : null,
        })
        .where(eq(transactionsTable.id, id));

      return true;
    });

    return found ? this.findById(id, userId) : null;
  }

  async softDelete(id: number, userId: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(transactionsTable)
        .where(
          and(
            eq(transactionsTable.id, id),
            eq(transactionsTable.userId, userId),
            isNull(transactionsTable.deletedAt),
          ),
        )
        .for("update");
      if (!current) return false; 

      if (current.appliedAt) {
        const delta = signedAmount(current.operationType, current.amount);
        if (delta) await addToBalance(tx, current.accountId, userId, negate(delta));
      }

      await tx
        .update(transactionsTable)
        .set({ deletedAt: new Date(), appliedAt: null })
        .where(eq(transactionsTable.id, id));

      return true;
    });
  }

  async processDue(limit: number): Promise<number> {
    return db.transaction(async (tx) => {
      const now = new Date();

      const due = await tx
        .select({
          id: transactionsTable.id,
          userId: transactionsTable.userId,
          accountId: transactionsTable.accountId,
          operationType: transactionsTable.operationType,
          amount: transactionsTable.amount,
        })
        .from(transactionsTable)
        .where(
          and(
            isNull(transactionsTable.deletedAt),
            isNull(transactionsTable.appliedAt),
            ne(transactionsTable.operationType, "TRANSFER"),
            lte(transactionsTable.occurredAt, now),
          ),
        )
        .orderBy(asc(transactionsTable.accountId), asc(transactionsTable.id))
        .limit(limit)
        .for("update", { skipLocked: true });

      for (const row of due) {
        const delta = signedAmount(row.operationType, row.amount);
        if (delta) await addToBalance(tx, row.accountId, row.userId, delta);
      }

      if (due.length > 0) {
        await tx
          .update(transactionsTable)
          .set({
            appliedAt: now,
            updatedAt: sql`${transactionsTable.updatedAt}`,
          })
          .where(inArray(transactionsTable.id, due.map((r) => r.id)));
      }

      return due.length;
    });
  }
}