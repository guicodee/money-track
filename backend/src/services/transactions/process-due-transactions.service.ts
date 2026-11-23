import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";

export const DUE_BATCH_SIZE = 100;

export class ProcessDueTransactionsService {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async execute(): Promise<number> {
    return this.transactionRepository.processDue(DUE_BATCH_SIZE);
  }
}