import type { CreateAccountDto } from "@src/dto/account-dto";
import { AppError, isUniqueViolation } from "@src/errors/error";
import type { IAccountRepository } from "@src/repositories/interfaces/account-repository-interface";

export class CreateAccountService {
  constructor(private accountRepository: IAccountRepository) {}

  async execute(data: CreateAccountDto) {
    const existing = await this.accountRepository.findByUserId(data.userId);

    if (existing) {
      throw new AppError("You already have an account", 409);
    }

    try {
      const account = await this.accountRepository.create(data);
      return { account };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("You already have an account", 409);
      }
      throw error;
    }
  }
}