import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, setupUserWithAccount } from "../helpers/e2e";
import { resetDatabase } from "../setup/db";

let app: FastifyInstance;
beforeAll(async () => { app = await buildTestApp(); });
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("limites de entrada (evitam 500 e 400 enganoso do Postgres)", () => {
  it.each([
    ["GET", "/categories/99999999999"],
    ["PATCH", "/categories/99999999999"],
    ["DELETE", "/categories/99999999999"],
    ["GET", "/transactions/99999999999"],
    ["DELETE", "/transactions/99999999999"],
  ])("%s %s retorna 400 de validação", async (method, url) => {
    const c = await setupUserWithAccount(app);

    const res = await app.inject({ method: method as "GET", url, headers: c.user.headers, payload: method === "PATCH" ? { description: "x" } : undefined });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe("Validation error");
  });

  it.each(["/categories?page=1000001", "/transactions?page=1000001", "/transactions?accountId=99999999999", "/transactions?categoryId=99999999999"])(
    "%s retorna 400 de validação",
    async (url) => {
      const c = await setupUserWithAccount(app);
      const res = await c.api.get(url);
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe("Validation error");
    },
  );

  it("accountId e categoryId gigantes no corpo de uma transação retornam 400", async () => {
    const c = await setupUserWithAccount(app);

    expect((await c.api.post("/transactions", { ...c.expense("10.00"), accountId: 99999999999 })).statusCode).toBe(400);
    expect((await c.api.post("/transactions", { ...c.expense("10.00"), categoryId: 99999999999 })).statusCode).toBe(400);
  });
});