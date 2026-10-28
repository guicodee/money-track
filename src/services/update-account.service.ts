import type { UpdateAccountDto } from "@src/dto/account-dto";
import { AppError } from "@src/errors/error";
import type { IAccountRepository } from "@src/repositories/interfaces/account-repository-interface";

export class UpdateAccountService {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(userId: number, data: UpdateAccountDto) {
    const account = await this.accountRepository.findByUserId(userId);

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    const updated = await this.accountRepository.update(userId, data);

    return { account: updated };
  }
}