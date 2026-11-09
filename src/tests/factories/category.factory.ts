import type { CategoryDto } from "@src/dto/category-dto";

let seq = 0;

export function makeCategory(overrides: Partial<CategoryDto> = {}): CategoryDto {
  seq += 1;
  return {
    id: seq,
    userId: 1,
    description: `Category ${seq}`,
    categoryType: "EXPENSE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}