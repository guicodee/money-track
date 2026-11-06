import type { userDto } from "@src/dto/user-dto";

let seq = 0;

export function makeUser(overrides: Partial<userDto> = {}): userDto {
  seq += 1;
  return {
    id: seq,
    name: `User ${seq}`,
    email: `user${seq}@test.com`,
    password: "stored-hash",
    language: "pt",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as userDto;
}