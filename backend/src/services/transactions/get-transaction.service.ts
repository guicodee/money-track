import type { FindTransactionDto, TransactionDto } from "@src/dto/transaction-dto";
import { AppError } from "@src/errors/error";
import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";

export class GetTransactionService {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute({ id, userId }: FindTransactionDto): Promise<TransactionDto> {
    const transaction = await this.transactionRepository.findById(id, userId);
    if (!transaction) throw new AppError("Transaction not found", 404);
    return transaction;
  }
}