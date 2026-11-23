import type { CreateTransactionDto, TransactionDto } from "@src/dto/transaction-dto";
import { AppError } from "@src/errors/error";
import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";
import type { AssertCategoryOperationService } from "@src/services/category/assert-category-operation.service";

export class CreateTransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly assertCategoryOperation: AssertCategoryOperationService,
  ) {}

  async execute(data: CreateTransactionDto): Promise<TransactionDto> {
    const account = await this.transactionRepository.findAccount(data.accountId, data.userId);
    if (!account) throw new AppError("Account not found", 404);
    if (!account.isActive) {
      throw new AppError("Inactive account cannot receive new transactions", 409);
    }

    if (data.operationType === "TRANSFER") {
      if (data.categoryId !== null) {
        throw new AppError("Transfers cannot have a category", 400);
      }
    } else {
      if (data.categoryId === null) {
        throw new AppError("Category is required for income and expenses", 400);
      }
      await this.assertCategoryOperation.execute({
        categoryId: data.categoryId,
        userId: data.userId,
        operationType: data.operationType,
      });
    }

    return this.transactionRepository.create(data);
  }
}