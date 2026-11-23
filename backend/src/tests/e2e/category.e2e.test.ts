import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildTestApp, createTx, setupUserWithAccount } from "../helpers/e2e";
import { resetDatabase } from "../setup/db";

let app: FastifyInstance;
beforeAll(async () => { app = await buildTestApp(); });
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("POST /categories", () => {
  it("cria e vincula ao usuário autenticado, ignorando userId do body", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.post("/categories", { description: "Lazer", categoryType: "EXPENSE", userId: 999 });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ description: "Lazer", categoryType: "EXPENSE", userId: c.user.id });
  });

  it("remove espaços das pontas da descrição", async () => {
    const c = await setupUserWithAccount(app);
    const res = await c.api.post("/categories", { description: "  Lazer  ", categoryType: "EXPENSE" });
    expect(res.json().description).toBe("Lazer");
  });

  it("rejeita duplicada (mesmo nome e tipo), ignorando maiúsculas e espaços", async () => {
    const c = await setupUserWithAccount(app); 

    expect((await c.api.post("/categories", { description: "Mercado", categoryType: "EXPENSE" })).statusCode).toBe(409);
    expect((await c.api.post("/categories", { description: "  mercado ", categoryType: "EXPENSE" })).statusCode).toBe(409);
  });

  it("permite o mesmo nome com tipo diferente", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.post("/categories", { description: "Mercado", categoryType: "INCOME" })).statusCode).toBe(201);
  });

  it("permite o mesmo nome e tipo para outro usuário", async () => {
    const [, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    expect((await b.api.post("/categories", { description: "Lazer", categoryType: "EXPENSE" })).statusCode).toBe(201);
  });

  it.each([
    ["sem tipo", { description: "X" }],
    ["tipo inválido", { description: "X", categoryType: "TRANSFER" }],
    ["descrição vazia", { description: "", categoryType: "EXPENSE" }],
    ["descrição só espaços", { description: "   ", categoryType: "EXPENSE" }],
    ["descrição longa demais", { description: "a".repeat(101), categoryType: "EXPENSE" }],
  ])("rejeita com 400: %s", async (_label, payload) => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.post("/categories", payload)).statusCode).toBe(400);
  });
});

describe("GET /categories", () => {
  it("lista só as categorias do usuário, ordenadas por descrição", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    await a.api.post("/categories", { description: "Aluguel", categoryType: "EXPENSE" });

    const res = await a.api.get("/categories");

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ page: 1, limit: 10, total: 3, totalPages: 1 });
    expect(res.json().data.map((x: { description: string }) => x.description)).toEqual(["Aluguel", "Mercado", "Salário"]);
    expect((await b.api.get("/categories")).json().total).toBe(2);
  });

  it("filtra por tipo", async () => {
    const c = await setupUserWithAccount(app);

    const expenses = (await c.api.get("/categories?type=EXPENSE")).json().data;
    const incomes = (await c.api.get("/categories?type=INCOME")).json().data;

    expect(expenses.every((x: { categoryType: string }) => x.categoryType === "EXPENSE")).toBe(true);
    expect(incomes.every((x: { categoryType: string }) => x.categoryType === "INCOME")).toBe(true);
    expect(expenses).toHaveLength(1);
    expect(incomes).toHaveLength(1);
  });

  it("pagina de 10 em 10", async () => {
    const c = await setupUserWithAccount(app);
    for (let i = 1; i <= 10; i++) {
      await c.api.post("/categories", { description: `Cat ${String(i).padStart(2, "0")}`, categoryType: "EXPENSE" });
    } 

    const p1 = (await c.api.get("/categories?page=1")).json();
    const p2 = (await c.api.get("/categories?page=2")).json();
    const p3 = (await c.api.get("/categories?page=3")).json();

    expect(p1.data).toHaveLength(10);
    expect(p2.data).toHaveLength(2);
    expect(p3.data).toHaveLength(0);
    expect(p1).toMatchObject({ total: 12, totalPages: 2 });
  });

  it.each(["?type=XYZ", "?page=0", "?page=abc"])("rejeita query inválida %s com 400", async (qs) => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.get(`/categories${qs}`)).statusCode).toBe(400);
  });
});

describe("GET/PATCH/DELETE /categories/:id: isolamento entre usuários (IDOR)", () => {
  it("outro usuário recebe 404 em tudo e a categoria permanece intacta", async () => {
    const [a, b] = [await setupUserWithAccount(app), await setupUserWithAccount(app)];
    const id = a.expenseCat.id;

    expect((await b.api.get(`/categories/${id}`)).statusCode).toBe(404);
    expect((await b.api.patch(`/categories/${id}`, { description: "Hack" })).statusCode).toBe(404);
    expect((await b.api.del(`/categories/${id}`)).statusCode).toBe(404);

    expect((await a.api.get(`/categories/${id}`)).json().description).toBe("Mercado");
  });

  it("id inexistente é 404 e id inválido é 400", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.get("/categories/999999")).statusCode).toBe(404);
    expect((await c.api.get("/categories/abc")).statusCode).toBe(400);
  });
});

describe("PATCH /categories/:id", () => {
  it("renomeia", async () => {
    const c = await setupUserWithAccount(app);
    const res = await c.api.patch(`/categories/${c.expenseCat.id}`, { description: "Supermercado" });
    expect(res.statusCode).toBe(200);
    expect(res.json().description).toBe("Supermercado");
  });

  it("rejeita corpo vazio com 400", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.patch(`/categories/${c.expenseCat.id}`, {})).statusCode).toBe(400);
  });

  it("rejeita renomear para um nome que já existe no mesmo tipo (409)", async () => {
    const c = await setupUserWithAccount(app);
    const other = (await c.api.post("/categories", { description: "Lazer", categoryType: "EXPENSE" })).json();

    expect((await c.api.patch(`/categories/${other.id}`, { description: "mercado" })).statusCode).toBe(409);
  });

  it("aceita reenviar o próprio nome", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.patch(`/categories/${c.expenseCat.id}`, { description: "Mercado" })).statusCode).toBe(200);
  });

  it("troca o tipo quando não há transações", async () => {
    const c = await setupUserWithAccount(app);
    const res = await c.api.patch(`/categories/${c.expenseCat.id}`, { categoryType: "INCOME" });
    expect(res.statusCode).toBe(200);
    expect(res.json().categoryType).toBe("INCOME");
  });

  it("bloqueia a troca de tipo com transações (409), mas permite renomear", async () => {
    const c = await setupUserWithAccount(app);
    await createTx(c.api, c.expense("10.00"));

    expect((await c.api.patch(`/categories/${c.expenseCat.id}`, { categoryType: "INCOME" })).statusCode).toBe(409);
    expect((await c.api.patch(`/categories/${c.expenseCat.id}`, { description: "Novo nome" })).statusCode).toBe(200);
  });
});

describe("DELETE /categories/:id", () => {
  it("exclui categoria sem transações", async () => {
    const c = await setupUserWithAccount(app);
    expect((await c.api.del(`/categories/${c.expenseCat.id}`)).statusCode).toBe(204);
    expect((await c.api.get(`/categories/${c.expenseCat.id}`)).statusCode).toBe(404);
  });

  it("bloqueia com 409 quando há transações (inclusive excluídas logicamente)", async () => {
    const c = await setupUserWithAccount(app);
    const t = await createTx(c.api, c.expense("10.00"));

    expect((await c.api.del(`/categories/${c.expenseCat.id}`)).statusCode).toBe(409);

    await c.api.del(`/transactions/${t.id}`);
    expect((await c.api.del(`/categories/${c.expenseCat.id}`)).statusCode).toBe(409);
  });
});