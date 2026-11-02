import type { TransactionDto, UpdateTransactionDataDto, UpdateTransactionDto } from "@src/dto/transaction-dto";
import type { AssertCategoryOperationService } from "../category/assert-category-operation.service";
import type { ITransactionRepository } from "@src/repositories/interfaces/transaction-repostory-interface";
import { AppError } from "@src/errors/error";

export class UpdateTransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly assertCategoryOperation: AssertCategoryOperationService,
  ) {}

  async execute({ id, userId, ...patch }: UpdateTransactionDto): Promise<TransactionDto> {
    const current = await this.transactionRepository.findById(id, userId);
    if (!current) throw new AppError("Transaction not found", 404);

    if (patch.accountId !== undefined && patch.accountId !== current.account.id) {
      const account = await this.transactionRepository.findAccount(patch.accountId, userId);
      if (!account) throw new AppError("Account not found", 404);
      if (!account.isActive) {
        throw new AppError("Inactive account cannot receive new transactions", 409);
      }
    }

    const data: UpdateTransactionDataDto = {
      description: patch.description,
      amount: patch.amount,
      occurredAt: patch.occurredAt,
      accountId: patch.accountId,
    };

    if (patch.operationType !== undefined || patch.categoryId !== undefined) {
      const operationType = patch.operationType ?? current.operationType;
      let categoryId: number | null;

      if (operationType === "TRANSFER") {
        if (patch.categoryId != null) {
          throw new AppError("Transfers cannot have a category", 400);
        }
        categoryId = null; 
      } else {
        categoryId =
          patch.categoryId !== undefined ? patch.categoryId : (current.category?.id ?? null);
        if (categoryId === null) {
          throw new AppError("Category is required for income and expenses", 400);
        }
        await this.assertCategoryOperation.execute({ categoryId, userId, operationType });
      }

      data.operationType = operationType;
      data.categoryId = categoryId;
    }

    const updated = await this.transactionRepository.update(id, userId, data);
    if (!updated) throw new AppError("Transação não encontrada", 404);
    return updated;
  }
}