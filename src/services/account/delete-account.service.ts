import { AppError } from "@src/errors/error";
import type { IAccountRepository } from "@src/repositories/interfaces/account-repository-interface";

export class DeleteAccountService {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(userId: number) {
    const account = await this.accountRepository.findByUserId(userId);

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    if (await this.accountRepository.hasTransactions(account.id)) {
      throw new AppError("Account has transactions. Deactivate it instead of deleting", 409);
    }

    await this.accountRepository.delete(userId);
  }
}