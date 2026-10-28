// src/repositories/implementations/account-repository.ts
import { db } from "@src/db";
import { accountTable } from "@src/db/schema/account";
import { transactionsTable } from "@src/db/schema/transactions";
import type { AccountDto, CreateAccountDto, UpdateAccountDto } from "@src/dto/account-dto";
import { eq } from "drizzle-orm";
import type { IAccountRepository } from "../interfaces/account-repository-interface";

export class AccountRepository implements IAccountRepository {
  async create(data: CreateAccountDto): Promise<AccountDto> {
    const [account] = await db.insert(accountTable).values(data).returning();
    return account;
  }

  async findByUserId(userId: number): Promise<AccountDto | null> {
    const [account] = await db
      .select()
      .from(accountTable)
      .where(eq(accountTable.userId, userId))
      .limit(1);

    return account ?? null;
  }

  async update(userId: number, data: UpdateAccountDto): Promise<AccountDto> {
    const [account] = await db
      .update(accountTable)
      .set(data)
      .where(eq(accountTable.userId, userId))
      .returning();

    return account;
  }

  async delete(userId: number): Promise<void> {
    await db.delete(accountTable).where(eq(accountTable.userId, userId));
  }

  async hasTransactions(accountId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(eq(transactionsTable.accountId, accountId))
      .limit(1);

    return !!row;
  }
}