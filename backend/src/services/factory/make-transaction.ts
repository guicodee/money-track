import { CategoryRepository } from "@src/repositories/implementations/category-repository";
import { TransactionRepository } from "@src/repositories/implementations/transaction-repository";
import { AssertCategoryOperationService } from "../category/assert-category-operation.service";
import { CreateTransactionService } from "../transactions/create-transaction.service";
import { ListTransactionsService } from "../transactions/list-transactions.service";
import { UpdateTransactionService } from "../transactions/update-transaction.service";
import { GetTransactionService } from "../transactions/get-transaction.service";
import { DeleteTransactionService } from "../transactions/delete-transaction.service";
import { ProcessDueTransactionsService } from "../transactions/process-due-transactions.service";

const transaction_repository = new TransactionRepository();
const categoryRepository = new CategoryRepository();
const assert_category_operation_service = new AssertCategoryOperationService(categoryRepository);

export const MakeCreateTransactionService = () => new CreateTransactionService(
  transaction_repository, 
  assert_category_operation_service
);
export const MakeUpdateTransactionService = () => new UpdateTransactionService(
  transaction_repository, 
  assert_category_operation_service
);
export const MakeListTransactionsService = () => new ListTransactionsService(transaction_repository);
export const MakeGetTransactionService = () => new GetTransactionService(transaction_repository);
export const MakeDeleteTransactionService = () => new DeleteTransactionService(transaction_repository);
export const MakeProcessDueTransactionsService = () => new ProcessDueTransactionsService(transaction_repository);
