import type { CategoryType } from "./category-dto";

export type OperationType = "EXPENSE" | "INCOME" | "TRANSFER";
export type TransactionStatus = "PENDING" | "EFFECTIVE";
export type TransactionPeriod = "7d" | "30d" | "365d";

export interface TransactionDto {
  id: number;
  description: string;
  amount: string; 
  operationType: OperationType;
  occurredAt: Date;
  status: TransactionStatus | null; 
  account: { id: number; name: string; isActive: boolean };
  category: { id: number; description: string; categoryType: CategoryType } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionAccountDto {
  id: number;
  isActive: boolean;
}

export interface CreateTransactionDto {
  userId: number;
  description: string;
  amount: string;
  operationType: OperationType;
  occurredAt: Date;
  accountId: number;
  categoryId: number | null;
}

export interface FindTransactionDto {
  id: number;
  userId: number;
}

export interface UpdateTransactionDataDto {
  description?: string;
  amount?: string;
  operationType?: OperationType;
  occurredAt?: Date;
  accountId?: number;
  categoryId?: number | null;
}

export interface UpdateTransactionDto extends FindTransactionDto, UpdateTransactionDataDto {}

export interface ListTransactionsDto {
  userId: number;
  type?: OperationType;
  accountId?: number;
  categoryId?: number;
  startDate?: string; 
  endDate?: string;   
  period?: TransactionPeriod;
  page: number;
}

export interface ListTransactionsRepositoryDto {
  userId: number;
  type?: OperationType;
  accountId?: number;
  categoryId?: number;
  from?: Date; 
  to?: Date;   
  limit: number;
  offset: number;
}

export interface ListTransactionsResultDto {
  items: TransactionDto[];
  total: number;
}

export interface PaginatedTransactionsDto {
  data: TransactionDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}