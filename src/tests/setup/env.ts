import { parse } from "dotenv";
import { existsSync, readFileSync } from "node:fs";

export function loadTestEnv(): Record<string, string> {
  if (!existsSync(".env.test")) {
    throw new Error("Arquivo .env.test não encontrado. Rode: cp .env.test.example .env.test");
  }
  return { ...parse(readFileSync(".env.test")), NODE_ENV: "test" };
}