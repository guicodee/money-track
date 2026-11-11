import { todayInSaoPaulo } from "@src/utils/date";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  FUTURE_DATE, PAST_DATE, balanceOf, buildTestApp, createTx, setupUserWithAccount, type Ctx,
} from "../helpers/e2e";
import { resetDatabase } from "../setup/db";

let app: FastifyInstance;
beforeAll(async () => { app = await buildTestApp(); });
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("fluxo completo: o saldo acompanha cada operação", () => {
  it("criar, editar, efetivar e excluir terminam no saldo inicial", async () => {
    const c = await setupUserWithAccount(app, "1000.00");
    const { api } = c;

    const inc = await createTx(api, c.income("500.00"));
    expect(inc).toMatchObject({ status: "EFFECTIVE", amount: "500.00" });
    expect(await balanceOf(api)).toBe("1500.00");

    const exp = await createTx(api, c.expense("200.5"));
    expect(exp.amount).toBe("200.50");
    expect(await balanceOf(api)).toBe("1299.50");

    const pending = await createTx(api, c.expense("100.00", FUTURE_DATE));
    expect(pending.status).toBe("PENDING");
    expect(await balanceOf(api)).toBe("1299.50");

    const transfer = await createTx(api, c.transfer("300.00"));
    expect(transfer).toMatchObject({ status: null, category: null });
    expect(await balanceOf(api)).toBe("1299.50");

    await api.patch(`/transactions/${inc.id}`, { amount: "800.00" });
    expect(await balanceOf(api)).toBe("1599.50");

    const eff = await api.patch(`/transactions/${pending.id}`, { occurredAt: PAST_DATE });
    expect(eff.json().status).toBe("EFFECTIVE");
    expect(await balanceOf(api)).toBe("1499.50");

    for (const id of [exp.id, pending.id, inc.id, transfer.id]) {
      expect((await api.del(`/transactions/${id}`)).statusCode).toBe(204);
    }
    expect(await balanceOf(api)).toBe("1000.00");
    expect((await api.get("/transactions")).json().total).toBe(0);
  });

  it("a resposta traz conta e categoria aninhadas e não vaza userId nem appliedAt", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.post("/transactions", c.expense("10.00"));

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.account).toMatchObject({ id: c.account.id, isActive: true });
    expect(body.category).toMatchObject({ id: c.expenseCat.id, categoryType: "EXPENSE" });
    expect(body).not.toHaveProperty("userId");
    expect(body).not.toHaveProperty("appliedAt");
  });

  it("permite saldo negativo", async () => {
    const c = await setupUserWithAccount(app, "100.00");
    await createTx(c.api, c.expense("250.00"));
    expect(await balanceOf(c.api)).toBe("-150.00");
  });

  it("não perde atualizações com requisições simultâneas", async () => {
    const c = await setupUserWithAccount(app, "1000.00");

    const results = await Promise.all([
      ...Array.from({ length: 8 }, () => c.api.post("/transactions", c.expense("10.00"))),
      ...Array.from({ length: 4 }, () => c.api.post("/transactions", c.income("25.00"))),
    ]);

    expect(results.every((r) => r.statusCode === 201)).toBe(true);
    expect(await balanceOf(c.api)).toBe("1020.00");
    expect((await c.api.get("/transactions")).json().total).toBe(12);
  });
});

describe("POST /transactions: validações", () => {
  const invalid: [string, (c: Ctx) => Record<string, unknown>][] = [
    ["descrição vazia", () => ({ description: "" })],
    ["descrição só com espaços", () => ({ description: "   " })],
    ["valor zero", () => ({ amount: "0" })],
    ["valor 0.00", () => ({ amount: "0.00" })],
    ["valor negativo", () => ({ amount: "-5" })],
    ["3 casas decimais", () => ({ amount: "10.999" })],
    ["valor não numérico", () => ({ amount: "abc" })],
    ["valor como número JSON", () => ({ amount: 10.5 })],
    ["tipo inválido", () => ({ operationType: "OUTRO" })],
    ["data inexistente", () => ({ occurredAt: "2020-02-30" })],
    ["data com horário (ISO)", () => ({ occurredAt: "2020-01-01T10:00:00Z" })],
    ["despesa sem categoria", () => ({ categoryId: null })],
    ["despesa com categoria INCOME", (c) => ({ categoryId: c.incomeCat.id })],
    ["transferência com categoria", (c) => ({ operationType: "TRANSFER", categoryId: c.expenseCat.id })],
    ["sem accountId", () => ({ accountId: undefined })],
  ];

  it.each(invalid)("rejeita com 400 e não altera nada: %s", async (_label, override) => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.post("/transactions", { ...c.expense("10.00"), ...override(c) });

    expect(res.statusCode).toBe(400);
    expect(await balanceOf(c.api)).toBe("1000.00");
    expect((await c.api.get("/transactions")).json().total).toBe(0);
  });

  it("receita com categoria EXPENSE é rejeitada", async () => {
    const c = await setupUserWithAccount(app);
    const res = await c.api.post("/transactions", c.income("10.00", PAST_DATE, { categoryId: c.expenseCat.id }));
    expect(res.statusCode).toBe(400);
  });

  it("ignora userId enviado no corpo: a transação é do usuário autenticado", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.post("/transactions", c.expense("10.00", PAST_DATE, { userId: 999 }));

    expect(res.statusCode).toBe(201);
    expect((await c.api.get(`/transactions/${res.json().id}`)).statusCode).toBe(200);
  });
});

describe("isolamento entre usuários (IDOR)", () => {
  it("não permite ler, editar ou excluir transação de outro usuário", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    const t = await createTx(a.api, a.expense("100.00")); 

    expect((await b.api.get(`/transactions/${t.id}`)).statusCode).toBe(404);
    expect((await b.api.patch(`/transactions/${t.id}`, { amount: "1.00" })).statusCode).toBe(404);
    expect((await b.api.del(`/transactions/${t.id}`)).statusCode).toBe(404);

    expect((await a.api.get(`/transactions/${t.id}`)).json().amount).toBe("100.00");
    expect(await balanceOf(a.api)).toBe("900.00");
    expect(await balanceOf(b.api)).toBe("1000.00");
  });

  it("não lista transações de outro usuário", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    await createTx(a.api, a.expense("10.00"));

    expect((await b.api.get("/transactions")).json().total).toBe(0);
  });

  it("não permite usar a conta ou a categoria de outro usuário", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];

    const withForeignAccount = await b.api.post("/transactions", { ...b.expense("10.00"), accountId: a.account.id });
    const withForeignCategory = await b.api.post("/transactions", { ...b.expense("10.00"), categoryId: a.expenseCat.id });

    expect(withForeignAccount.statusCode).toBe(404);
    expect(withForeignCategory.statusCode).toBe(404);
    expect(await balanceOf(a.api)).toBe("1000.00");
    expect((await a.api.get("/transactions")).json().total).toBe(0);
  });

  it("não permite editar para a conta ou categoria de outro usuário", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    const t = await createTx(b.api, b.expense("10.00"));

    const toForeignAccount = await b.api.patch(`/transactions/${t.id}`, { accountId: a.account.id });
    const toForeignCategory = await b.api.patch(`/transactions/${t.id}`, { categoryId: a.expenseCat.id });

    expect(toForeignAccount.statusCode).toBe(404);
    expect(toForeignCategory.statusCode).toBe(404);
    expect(await balanceOf(a.api)).toBe("1000.00");
  });
});

describe("PATCH /transactions/:id", () => {
  it("receita -> despesa exige categoria compatível", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.income("500.00")); 

    const wrong = await c.api.patch(`/transactions/${t.id}`, { operationType: "EXPENSE" });
    expect(wrong.statusCode).toBe(400);
    expect(await balanceOf(c.api)).toBe("1500.00");

    const ok = await c.api.patch(`/transactions/${t.id}`, { operationType: "EXPENSE", categoryId: c.expenseCat.id });
    expect(ok.statusCode).toBe(200);
    expect(await balanceOf(c.api)).toBe("500.00");
  });

  it("despesa -> transferência remove a categoria e reverte o saldo; categoria junto é rejeitada", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("200.00")); 

    const withCat = await c.api.patch(`/transactions/${t.id}`, { operationType: "TRANSFER", categoryId: c.expenseCat.id });
    expect(withCat.statusCode).toBe(400);

    const res = await c.api.patch(`/transactions/${t.id}`, { operationType: "TRANSFER" });
    expect(res.json()).toMatchObject({ status: null, category: null });
    expect(await balanceOf(c.api)).toBe("1000.00");
  });

  it("transferência -> despesa sem categoria é rejeitada", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.transfer("300.00"));

    expect((await c.api.patch(`/transactions/${t.id}`, { operationType: "EXPENSE" })).statusCode).toBe(400);
  });

  it("efetivada -> data futura volta a PENDING e reverte o saldo", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.income("500.00"));

    const res = await c.api.patch(`/transactions/${t.id}`, { occurredAt: FUTURE_DATE });

    expect(res.json().status).toBe("PENDING");
    expect(await balanceOf(c.api)).toBe("1000.00");
  });

  it("rejeita corpo vazio e transação já excluída", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("10.00"));

    expect((await c.api.patch(`/transactions/${t.id}`, {})).statusCode).toBe(400);

    await c.api.del(`/transactions/${t.id}`);
    expect((await c.api.patch(`/transactions/${t.id}`, { description: "x" })).statusCode).toBe(404);
  });
});

describe("DELETE /transactions/:id", () => {
  it("não permite exclusão duplicada nem reverte o saldo duas vezes", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("200.00"));

    expect((await c.api.del(`/transactions/${t.id}`)).statusCode).toBe(204);
    expect((await c.api.del(`/transactions/${t.id}`)).statusCode).toBe(404);

    expect(await balanceOf(c.api)).toBe("1000.00");
    expect((await c.api.get(`/transactions/${t.id}`)).statusCode).toBe(404);
  });

  it("id inválido é 400 e inexistente é 404", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.del("/transactions/abc")).statusCode).toBe(400);
    expect((await c.api.del("/transactions/999999")).statusCode).toBe(404);
  });
});

describe("conta inativa", () => {
  it("congela cadastro, edição e exclusão (409), mas permite consultar", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("100.00"));
    await c.api.patch("/accounts/me", { isActive: false });

    expect((await c.api.post("/transactions", c.expense("10.00"))).statusCode).toBe(409);
    expect((await c.api.patch(`/transactions/${t.id}`, { amount: "1.00" })).statusCode).toBe(409);
    expect((await c.api.del(`/transactions/${t.id}`)).statusCode).toBe(409);

    expect((await c.api.get(`/transactions/${t.id}`)).json().account.isActive).toBe(false);
    expect((await c.api.get("/transactions")).json().total).toBe(1);
    expect(await balanceOf(c.api)).toBe("900.00");
  });

  it("volta a aceitar operações depois da reativação", async () => {
    const c = await setupUserWithAccount(app);
    await c.api.patch("/accounts/me", { isActive: false });
    await c.api.patch("/accounts/me", { isActive: true });

    expect((await c.api.post("/transactions", c.expense("10.00"))).statusCode).toBe(201);
  });
});

describe("GET /transactions: listagem e filtros", () => {
  it("ordena da data mais recente para a mais antiga e traz o formato paginado", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("1.00", "2020-01-01"));
    await createTx(c.api, c.expense("2.00", "2020-03-01"));
    await createTx(c.api, c.expense("3.00", "2020-02-01"));

    const res = await c.api.get("/transactions");

    expect(res.json()).toMatchObject({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.json().data.map((t: { amount: string }) => t.amount)).toEqual(["2.00", "3.00", "1.00"]);
  });

  it("pagina de 10 em 10", async () => {
    const c = await setupUserWithAccount(app);
    for (let i = 0; i < 12; i++) await createTx(c.api, c.income("1.00"));

    const p1 = (await c.api.get("/transactions?page=1")).json();
    const p2 = (await c.api.get("/transactions?page=2")).json();

    expect(p1.data).toHaveLength(10);
    expect(p2.data).toHaveLength(2);
    expect(p1).toMatchObject({ total: 12, totalPages: 2 });
    expect((await c.api.get("/transactions?page=99")).json().data).toEqual([]);
  });

  it("filtra por tipo, categoria e intervalo de datas (extremos inclusivos)", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("1.00", "2020-01-10"));
    await createTx(c.api, c.income("2.00", "2020-02-10"));
    await createTx(c.api, c.transfer("3.00", "2020-03-10"));

    const byType = (await c.api.get("/transactions?type=TRANSFER")).json();
    const byCategory = (await c.api.get(`/transactions?categoryId=${c.expenseCat.id}`)).json();
    const byDay = (await c.api.get("/transactions?startDate=2020-02-10&endDate=2020-02-10")).json();
    const combined = (await c.api.get(`/transactions?type=EXPENSE&startDate=2020-01-01&endDate=2020-12-31`)).json();

    expect(byType.total).toBe(1);
    expect(byCategory.data.map((t: { amount: string }) => t.amount)).toEqual(["1.00"]);
    expect(byDay.data.map((t: { amount: string }) => t.amount)).toEqual(["2.00"]);
    expect(combined.total).toBe(1);
  });

  it("period=7d traz só o recente e exclui o antigo e o futuro", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("1.00", todayInSaoPaulo()));
    await createTx(c.api, c.expense("2.00", PAST_DATE));
    await createTx(c.api, c.expense("3.00", FUTURE_DATE));

    const res = (await c.api.get("/transactions?period=7d")).json();

    expect(res.data.map((t: { amount: string }) => t.amount)).toEqual(["1.00"]);
  });

  it("transações futuras aparecem com startDate/endDate explícitos", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("3.00", FUTURE_DATE));

    const res = (await c.api.get("/transactions?startDate=2999-01-01&endDate=2999-12-31")).json();

    expect(res.data[0].status).toBe("PENDING");
  });

  it.each([
    "?period=7d&startDate=2020-01-01",
    "?startDate=2020-02-01&endDate=2020-01-01",
    "?period=99d",
    "?startDate=2020-02-30",
    "?type=XYZ",
    "?page=0",
    "?accountId=abc",
  ])("rejeita query inválida %s com 400", async (qs) => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.get(`/transactions${qs}`)).statusCode).toBe(400);
  });

  it("não lista transações excluídas logicamente", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("1.00"));
    await c.api.del(`/transactions/${t.id}`);

    expect((await c.api.get("/transactions")).json().total).toBe(0);
  });
});