import type { 
  CreateTransactionDto, 
  ListTransactionsRepositoryDto, 
  ListTransactionsResultDto, 
  TransactionAccountDto, 
  TransactionDto, 
  UpdateTransactionDataDto 
} from "@src/dto/transaction-dto";


export interface ITransactionRepository {
  findAccount(accountId: number, userId: number): Promise<TransactionAccountDto | null>;
  create(data: CreateTransactionDto): Promise<TransactionDto>;
  findById(id: number, userId: number): Promise<TransactionDto | null>;
  list(params: ListTransactionsRepositoryDto): Promise<ListTransactionsResultDto>;
  update(id: number, userId: number, data: UpdateTransactionDataDto): Promise<TransactionDto | null>;
  softDelete(id: number, userId: number): Promise<boolean>;
  processDue(limit: number): Promise<number>;
}