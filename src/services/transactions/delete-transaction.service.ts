import type { FindTransactionDto } from "@src/dto/transaction-dto";
import { AppError } from "@src/errors/error";
import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";

export class DeleteTransactionService {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute({ id, userId }: FindTransactionDto): Promise<void> {
    const deleted = await this.transactionRepository.softDelete(id, userId);
    if (!deleted) throw new AppError("Transaction not found", 404);
  }
}