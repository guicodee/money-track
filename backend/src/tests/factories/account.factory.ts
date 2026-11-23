import type { AccountDto } from "@src/dto/account-dto";

let seq = 0;

export function makeAccount(overrides: Partial<AccountDto> = {}): AccountDto {
  seq += 1;
  return {
    id: seq,
    name: `Account ${seq}`,
    initialBalance: "0.00",
    currentBalance: "0.00",
    currency: "BRL",
    isActive: true,
    userId: seq,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}