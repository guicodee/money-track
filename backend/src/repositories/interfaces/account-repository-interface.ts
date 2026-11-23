import type { AccountDto, CreateAccountDto, UpdateAccountDto } from "@src/dto/account-dto";

export interface IAccountRepository {
  create(data: CreateAccountDto): Promise<AccountDto>;
  findByUserId(userId: number): Promise<AccountDto | null>;
  update(userId: number, data: UpdateAccountDto): Promise<AccountDto>;
  delete(userId: number): Promise<void>;
  hasTransactions(accountId: number): Promise<boolean>;
}