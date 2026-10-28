import { AppError } from "@src/errors/error";
import type { IAccountRepository } from "@src/repositories/interfaces/account-repository-interface";

export class GetMyAccountService {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(userId: number) {
    const account = await this.accountRepository.findByUserId(userId);

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    return { account };
  }
}