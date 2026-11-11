import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, clientFor, createTx, registerAndLogin, setupUserWithAccount } from "../helpers/e2e";
import { resetDatabase } from "../setup/db";

let app: FastifyInstance;
beforeAll(async () => { app = await buildTestApp(); });
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("POST /accounts", () => {
  it("cria a conta com currentBalance igual ao initialBalance", async () => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).post("/accounts", { name: "Principal", initialBalance: "1500.00", currency: "USD" });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      name: "Principal", initialBalance: "1500.00", currentBalance: "1500.00",
      currency: "USD", isActive: true, userId: u.id,
    });
  });

  it("usa os defaults (saldo 0.00 e BRL)", async () => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).post("/accounts", { name: "Principal" });

    expect(res.json()).toMatchObject({ initialBalance: "0.00", currentBalance: "0.00", currency: "BRL" });
  });

  it.each(["-50.25", "0.00", "999999999999.99"])("aceita saldo inicial %s", async (initialBalance) => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).post("/accounts", { name: "P", initialBalance });

    expect(res.statusCode).toBe(201);
    expect(res.json().currentBalance).toBe(initialBalance);
  });

  it("ignora currentBalance, userId, id e isActive enviados pelo cliente", async () => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).post("/accounts", {
      name: "P", initialBalance: "100.00", currentBalance: "999999.00", userId: 9999, id: 9999, isActive: false,
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ currentBalance: "100.00", userId: u.id, isActive: true });
    expect(res.json().id).not.toBe(9999);
  });

  it.each([
    ["nome vazio", { name: "" }],
    ["nome só com espaços", { name: "   " }],
    ["nome ausente", {}],
    ["nome com 101 caracteres", { name: "a".repeat(101) }],
    ["moeda não suportada", { name: "P", currency: "EUR" }],
    ["saldo com 3 casas decimais", { name: "P", initialBalance: "1.234" }],
    ["saldo com 13 dígitos inteiros", { name: "P", initialBalance: "1234567890123" }],
    ["saldo não numérico", { name: "P", initialBalance: "abc" }],
    ["saldo como número JSON", { name: "P", initialBalance: 100 }],
  ])("rejeita com 400: %s", async (_label, payload) => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).post("/accounts", payload);

    expect(res.statusCode).toBe(400);
  });

  it("não permite uma segunda conta (409), com qualquer nome", async () => {
    const u = await registerAndLogin(app);
    const api = clientFor(app, u);
    await api.post("/accounts", { name: "A" });

    expect((await api.post("/accounts", { name: "B" })).statusCode).toBe(409);
  });

  it("duas criações simultâneas resultam em exatamente uma conta", async () => {
    const u = await registerAndLogin(app);
    const api = clientFor(app, u);

    const results = await Promise.all([api.post("/accounts", { name: "A" }), api.post("/accounts", { name: "B" })]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
  });

  it("usuários diferentes podem ter contas com o mesmo nome", async () => {
    const [a, b] = [await registerAndLogin(app), await registerAndLogin(app)];
    await clientFor(app, a).post("/accounts", { name: "Principal" });

    expect((await clientFor(app, b).post("/accounts", { name: "Principal" })).statusCode).toBe(201);
  });
});

describe("GET /accounts/me", () => {
  it("retorna a conta do usuário autenticado", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.get("/accounts/me");

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: c.account.id, userId: c.user.id });
  });

  it("retorna 404 para usuário sem conta", async () => {
    const u = await registerAndLogin(app);
    expect((await clientFor(app, u).get("/accounts/me")).statusCode).toBe(404);
  });

  it("cada usuário enxerga só a própria conta", async () => {
    const [a, b] = [await setupUserWithAccount(app, "100.00"), await setupUserWithAccount(app, "200.00")];

    expect((await a.api.get("/accounts/me")).json().initialBalance).toBe("100.00");
    expect((await b.api.get("/accounts/me")).json().initialBalance).toBe("200.00");
  });
});

describe("PATCH /accounts/me", () => {
  it("atualiza o nome", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.patch("/accounts/me", { name: "  Novo nome  " });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Novo nome");
  });

  it("desativa e reativa, e o histórico continua consultável", async () => {
    const c = await setupUserWithAccount(app);

    expect((await c.api.patch("/accounts/me", { isActive: false })).json().isActive).toBe(false);
    expect((await c.api.get("/accounts/me")).statusCode).toBe(200);
    expect((await c.api.patch("/accounts/me", { isActive: true })).json().isActive).toBe(true);
  });

  it.each([
    ["corpo vazio", {}],
    ["só currentBalance", { currentBalance: "999.00" }],
    ["só initialBalance", { initialBalance: "500.00" }],
    ["só currency", { currency: "USD" }],
    ["nome vazio", { name: "" }],
    ["isActive não booleano", { isActive: "false" }],
  ])("rejeita com 400: %s", async (_label, payload) => {
    const c = await setupUserWithAccount(app);

    expect((await c.api.patch("/accounts/me", payload)).statusCode).toBe(400);
  });

  it("não altera saldo nem moeda quando enviados junto com campos válidos", async () => {
    const c = await setupUserWithAccount(app, "1000.00");

    const res = await c.api.patch("/accounts/me", { name: "X", currentBalance: "1.00", currency: "USD", userId: 999 });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: "X", currentBalance: "1000.00", currency: "BRL", userId: c.user.id });
  });

  it("retorna 404 para usuário sem conta", async () => {
    const u = await registerAndLogin(app);
    expect((await clientFor(app, u).patch("/accounts/me", { name: "X" })).statusCode).toBe(404);
  });

  it("atualizar a conta de um usuário não afeta a de outro", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];

    await a.api.patch("/accounts/me", { name: "Alterada", isActive: false });

    expect((await b.api.get("/accounts/me")).json()).toMatchObject({ name: "Principal", isActive: true });
  });
});

describe("DELETE /accounts/me", () => {
  it("exclui a conta sem transações", async () => {
    const c = await setupUserWithAccount(app);

    expect((await c.api.del("/accounts/me")).statusCode).toBe(204);
    expect((await c.api.get("/accounts/me")).statusCode).toBe(404);
  });

  it("bloqueia com 409 quando há transações, preservando o histórico", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("10.00"));

    expect((await c.api.del("/accounts/me")).statusCode).toBe(409);

    expect((await c.api.get("/accounts/me")).statusCode).toBe(200);
    expect((await c.api.get("/transactions")).json().total).toBe(1);
  });

  it("continua bloqueando quando a transação foi excluída logicamente", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("10.00"));
    await c.api.del(`/transactions/${t.id}`);

    expect((await c.api.del("/accounts/me")).statusCode).toBe(409);
  });

  it("retorna 404 para usuário sem conta", async () => {
    const u = await registerAndLogin(app);
    expect((await clientFor(app, u).del("/accounts/me")).statusCode).toBe(404);
  });
});