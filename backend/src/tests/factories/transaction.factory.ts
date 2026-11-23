import type { TransactionDto } from "@src/dto/transaction-dto";

let seq = 0;

export function makeTransaction(overrides: Partial<TransactionDto> = {}): TransactionDto {
  seq += 1;
  return {
    id: seq,
    description: `Transaction ${seq}`,
    amount: "10.00",
    operationType: "EXPENSE",
    occurredAt: new Date("2020-01-01T03:00:00Z"),
    status: "EFFECTIVE",
    account: { id: 1, name: "Principal", isActive: true },
    category: { id: 5, description: "Mercado", categoryType: "EXPENSE" },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}