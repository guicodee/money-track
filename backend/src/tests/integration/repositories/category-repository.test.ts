import { db } from "@src/db";
import { CategoryRepository } from "@src/repositories/implementations/category-repository";
import { TransactionRepository } from "@src/repositories/implementations/transaction-repository";
import { CreateCategoryService } from "@src/services/category/create-category.service";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  PAST, rejectionCode, seedCategory, seedFinancialContext, seedRawTransaction, seedUser,
} from "../../factories/seed";
import { resetDatabase } from "../../setup/db";

const repo = new CategoryRepository();
const transactions = new TransactionRepository();

async function mismatchedLinks() {
  const rows = await db.execute<{ n: string }>(sql`
    SELECT count(*)::text AS n
    FROM transactions t JOIN category c ON c.id = t.category_id
    WHERE t."operationType"::text <> c."categoryType"::text`);
  return Number([...rows][0].n);
}

beforeEach(resetDatabase);

describe("create e unicidade (banco)", () => {
  it("persiste descrição, tipo e dono, e findById devolve o mesmo registro", async () => {
    const user = await seedUser();

    const created = await repo.create({ userId: user.id, description: "Mercado", categoryType: "EXPENSE" });

    expect(created).toMatchObject({ userId: user.id, description: "Mercado", categoryType: "EXPENSE" });
    expect(await repo.findById(created.id, user.id)).toEqual(created);
  });

  it("rejeita a mesma tupla (usuário, nome, tipo) com 23505", async () => {
    const user = await seedUser();
    await seedCategory(user.id, "EXPENSE", "Mercado");

    expect(await rejectionCode(repo.create({ userId: user.id, description: "Mercado", categoryType: "EXPENSE" }))).toBe("23505");
  });

  it("rejeita variação de caixa no mesmo tipo (índice em lower(description))", async () => {
    const user = await seedUser();
    await seedCategory(user.id, "EXPENSE", "Mercado");

    expect(await rejectionCode(repo.create({ userId: user.id, description: "MERCADO", categoryType: "EXPENSE" }))).toBe("23505");
  });

  it("permite o mesmo nome com tipo diferente", async () => {
    const user = await seedUser();
    await seedCategory(user.id, "EXPENSE", "Mercado");

    await expect(repo.create({ userId: user.id, description: "Mercado", categoryType: "INCOME" })).resolves.toBeDefined();
  });

  it("permite o mesmo nome e tipo para usuários diferentes", async () => {
    const [a, b] = [await seedUser(), await seedUser()];
    await seedCategory(a.id, "EXPENSE", "Mercado");

    await expect(repo.create({ userId: b.id, description: "Mercado", categoryType: "EXPENSE" })).resolves.toBeDefined();
  });

  it("rejeita usuário inexistente (FK)", async () => {
    expect(await rejectionCode(repo.create({ userId: 999999, description: "X", categoryType: "EXPENSE" }))).toBe("23503");
  });
});

describe("findDuplicate", () => {
  it("ignora caixa, respeita tipo e usuário e exclui o excludeId", async () => {
    const [a, b] = [await seedUser(), await seedUser()];
    const cat = await seedCategory(a.id, "EXPENSE", "Mercado");
    await seedCategory(b.id, "EXPENSE", "Lazer");

    const find = (o: object) => repo.findDuplicate({ userId: a.id, description: "mercado", categoryType: "EXPENSE", ...o });

    expect((await find({}))?.id).toBe(cat.id);
    expect(await find({ categoryType: "INCOME" })).toBeNull();
    expect(await find({ excludeId: cat.id })).toBeNull();
    expect(await repo.findDuplicate({ userId: a.id, description: "Lazer", categoryType: "EXPENSE" })).toBeNull();
  });
});

describe("isolamento entre usuários", () => {
  it("findById, update e delete com o userId errado não encontram nem alteram", async () => {
    const [a, b] = [await seedUser(), await seedUser()];
    const cat = await seedCategory(a.id, "EXPENSE", "Mercado");

    expect(await repo.findById(cat.id, b.id)).toBeNull();
    expect(await repo.update(cat.id, b.id, { description: "Hack" })).toBeNull();
    expect(await repo.delete(cat.id, b.id)).toBe(false);
    expect((await repo.findById(cat.id, a.id))?.description).toBe("Mercado");
  });

  it("a listagem nunca traz categorias de outro usuário, mesmo com nomes iguais", async () => {
    const [a, b] = [await seedUser(), await seedUser()];
    await seedCategory(a.id, "EXPENSE", "Mercado");
    await seedCategory(b.id, "EXPENSE", "Mercado");

    const { items, total } = await repo.list({ userId: a.id, limit: 10, offset: 0 });

    expect(total).toBe(1);
    expect(items.every((c) => c.userId === a.id)).toBe(true);
  });
});

describe("list", () => {
  it("usuário sem categorias: vazio e total 0", async () => {
    const user = await seedUser();
    expect(await repo.list({ userId: user.id, limit: 10, offset: 0 })).toEqual({ items: [], total: 0 });
  });

  it("filtra por tipo e conta o total filtrado", async () => {
    const user = await seedUser();
    await seedCategory(user.id, "EXPENSE", "A");
    await seedCategory(user.id, "EXPENSE", "B");
    await seedCategory(user.id, "INCOME", "C");

    const expenses = await repo.list({ userId: user.id, type: "EXPENSE", limit: 10, offset: 0 });
    const incomes = await repo.list({ userId: user.id, type: "INCOME", limit: 10, offset: 0 });

    expect(expenses.total).toBe(2);
    expect(expenses.items.every((c) => c.categoryType === "EXPENSE")).toBe(true);
    expect(incomes.items.map((c) => c.description)).toEqual(["C"]);
  });

  it("pagina com limit e offset, em ordem por descrição, com total estável", async () => {
    const user = await seedUser();
    for (const name of ["D", "B", "A", "C", "E"]) await seedCategory(user.id, "EXPENSE", name);

    const p1 = await repo.list({ userId: user.id, limit: 2, offset: 0 });
    const p2 = await repo.list({ userId: user.id, limit: 2, offset: 2 });
    const p3 = await repo.list({ userId: user.id, limit: 2, offset: 4 });

    expect(p1.items.map((c) => c.description)).toEqual(["A", "B"]);
    expect(p2.items.map((c) => c.description)).toEqual(["C", "D"]);
    expect(p3.items.map((c) => c.description)).toEqual(["E"]);
    expect([p1.total, p2.total, p3.total]).toEqual([5, 5, 5]);
  });
});

describe("update atômico do tipo", () => {
  it("troca o tipo quando não há transações", async () => {
    const user = await seedUser();
    const cat = await seedCategory(user.id, "EXPENSE", "Mercado");

    const updated = await repo.update(cat.id, user.id, { categoryType: "INCOME" });

    expect(updated?.categoryType).toBe("INCOME");
  });

  it("bloqueia a troca de tipo com transação vinculada (409) e não altera a categoria", async () => {
    const c = await seedFinancialContext();
    await seedRawTransaction({ ...c.expense("10.00"), appliedAt: PAST });

    await expect(repo.update(c.expenseCat.id, c.user.id, { categoryType: "INCOME" }))
      .rejects.toMatchObject({ statusCode: 409 });

    expect((await repo.findById(c.expenseCat.id, c.user.id))?.categoryType).toBe("EXPENSE");
  });

  it("bloqueia a troca mesmo se a transação foi excluída logicamente", async () => {
    const c = await seedFinancialContext();
    await seedRawTransaction({ ...c.expense("10.00"), deletedAt: new Date() });

    await expect(repo.update(c.expenseCat.id, c.user.id, { categoryType: "INCOME" }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it("renomear com transação vinculada é permitido", async () => {
    const c = await seedFinancialContext();
    await seedRawTransaction({ ...c.expense("10.00"), appliedAt: PAST });

    const updated = await repo.update(c.expenseCat.id, c.user.id, { description: "Novo nome" });

    expect(updated?.description).toBe("Novo nome");
  });

  it("renomear para nome que já existe viola a unicidade (23505)", async () => {
    const user = await seedUser();
    await seedCategory(user.id, "EXPENSE", "Mercado");
    const other = await seedCategory(user.id, "EXPENSE", "Lazer");

    expect(await rejectionCode(repo.update(other.id, user.id, { description: "mercado" }))).toBe("23505");
  });
});

describe("hasTransactions", () => {
  it("é false sem transações, true com elas (inclusive excluídas) e escopado por usuário", async () => {
    const c = await seedFinancialContext();
    expect(await repo.hasTransactions(c.expenseCat.id, c.user.id)).toBe(false);

    await seedRawTransaction({ ...c.expense("10.00"), deletedAt: new Date() });

    expect(await repo.hasTransactions(c.expenseCat.id, c.user.id)).toBe(true);
    expect(await repo.hasTransactions(c.expenseCat.id, c.user.id + 999)).toBe(false);
  });
});

describe("delete e integridade referencial", () => {
  it("exclui categoria sem transações", async () => {
    const user = await seedUser();
    const cat = await seedCategory(user.id, "EXPENSE", "Mercado");

    expect(await repo.delete(cat.id, user.id)).toBe(true);
    expect(await repo.findById(cat.id, user.id)).toBeNull();
  });

  it("categoria com transação (ativa ou excluída logicamente) não é excluída: FK restrict 23503", async () => {
    const c = await seedFinancialContext();
    await seedRawTransaction({ ...c.expense("10.00"), deletedAt: new Date() });

    expect(await rejectionCode(repo.delete(c.expenseCat.id, c.user.id))).toBe("23503");
    expect(await repo.findById(c.expenseCat.id, c.user.id)).not.toBeNull();
  });
});

describe("concorrência", () => {
  it("duas criações idênticas: uma grava e a outra vira 409 (pelo service)", async () => {
    const user = await seedUser();
    const service = new CreateCategoryService(repo);
    const input = { userId: user.id, description: "Mercado", categoryType: "EXPENSE" as const };

    const results = await Promise.allSettled([service.execute(input), service.execute(input)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rejected.reason as { statusCode: number }).statusCode).toBe(409);
    expect((await repo.list({ userId: user.id, limit: 10, offset: 0 })).total).toBe(1);
  });

  it("'Mercado' e 'mercado' simultâneos: o banco garante só uma", async () => {
    const user = await seedUser();
    const service = new CreateCategoryService(repo);

    const results = await Promise.allSettled([
      service.execute({ userId: user.id, description: "Mercado", categoryType: "EXPENSE" }),
      service.execute({ userId: user.id, description: "mercado", categoryType: "EXPENSE" }),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await repo.list({ userId: user.id, limit: 10, offset: 0 })).total).toBe(1);
  });

  it("trocar o tipo versus criar transação: nunca fica despesa em categoria de receita", async () => {
    for (let i = 0; i < 10; i++) {
      const c = await seedFinancialContext();

      const [change, created] = await Promise.allSettled([
        repo.update(c.expenseCat.id, c.user.id, { categoryType: "INCOME" }),
        transactions.create(c.expense("10.00")),
      ]);

      expect([change.status, created.status].filter((s) => s === "fulfilled")).toHaveLength(1);
      expect(await mismatchedLinks()).toBe(0);
    }
  });

  it("excluir a categoria versus criar transação: ou existem as duas coisas, ou nenhuma", async () => {
    for (let i = 0; i < 10; i++) {
      const c = await seedFinancialContext();

      const [del, created] = await Promise.allSettled([
        repo.delete(c.expenseCat.id, c.user.id),
        transactions.create(c.expense("10.00")),
      ]);

      expect([del.status, created.status].filter((s) => s === "fulfilled")).toHaveLength(1);
      expect(await repo.hasTransactions(c.expenseCat.id, c.user.id)).toBe(created.status === "fulfilled");
    }
  });
});