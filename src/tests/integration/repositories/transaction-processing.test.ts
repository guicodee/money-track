import { AccountRepository } from "@src/repositories/implementations/account-repository";
import { TransactionRepository } from "@src/repositories/implementations/transaction-repository";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FUTURE,
  balanceMatchesAudit, countTransactions, getAccount, getBalance, pgCode,
  seedFinancialContext, seedRawTransaction, setActive
} from "../../factories/seed";
import { resetDatabase } from "../../setup/db";

const repo = new TransactionRepository();
const accounts = new AccountRepository();

type Ctx = Awaited<ReturnType<typeof seedFinancialContext>>;
const pending = (c: Ctx, kind: "income" | "expense", amount: string) =>
  seedRawTransaction({ ...c[kind](amount), appliedAt: null });

beforeEach(resetDatabase);

describe("processDue (Postgres)", () => {
  it("aplica a vencida pendente exatamente uma vez", async () => {
    const c = await seedFinancialContext();
    const t = await pending(c, "expense", "100.00");

    expect(await repo.processDue(100)).toBe(1);
    expect(await repo.processDue(100)).toBe(0);

    expect(await getBalance(c.account.id)).toBe("900.00");
    expect((await repo.findById(t.id, c.user.id))?.status).toBe("EFFECTIVE");
  });

  it("recupera transações vencidas há muito tempo (recuperação pós-queda)", async () => {
    const c = await seedFinancialContext();
    await pending(c, "income", "10.00");
    await pending(c, "income", "20.00");
    await pending(c, "expense", "5.00");

    expect(await repo.processDue(100)).toBe(3);

    expect(await getBalance(c.account.id)).toBe("1025.00");
  });

  it("ignora futuras, transferências e excluídas", async () => {
    const c = await seedFinancialContext();
    await seedRawTransaction({ ...c.expense("10.00", { occurredAt: FUTURE }) });
    await seedRawTransaction({ ...c.transfer("10.00") });
    await seedRawTransaction({ ...c.expense("10.00"), deletedAt: new Date() });

    expect(await repo.processDue(100)).toBe(0);

    expect(await getBalance(c.account.id)).toBe("1000.00");
  });

  it("respeita o limite do lote", async () => {
    const c = await seedFinancialContext();
    for (let i = 0; i < 3; i++) await pending(c, "income", "1.00");

    expect(await repo.processDue(2)).toBe(2);
    expect(await repo.processDue(2)).toBe(1);

    expect(await getBalance(c.account.id)).toBe("1003.00");
  });

  it("processa contas de usuários diferentes sem misturar saldos", async () => {
    const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];
    await pending(a, "income", "10.00");
    await pending(b, "expense", "30.00");

    expect(await repo.processDue(100)).toBe(2);

    expect(await getBalance(a.account.id)).toBe("1010.00");
    expect(await getBalance(b.account.id)).toBe("970.00");
  });
});

describe("conta inativa (Postgres)", () => {
  it("bloqueia cadastro com 409, sem gravar nada", async () => {
    const c = await seedFinancialContext();
    await setActive(c.account.id, false);

    await expect(repo.create(c.expense("10.00"))).rejects.toMatchObject({ statusCode: 409 });

    expect(await countTransactions(c.account.id)).toBe(0);
    expect(await getBalance(c.account.id)).toBe("1000.00");
  });

  it("bloqueia edição e exclusão de transações existentes com 409", async () => {
    const c = await seedFinancialContext();
    const t = await repo.create(c.expense("100.00"));
    await setActive(c.account.id, false);

    await expect(repo.update(t.id, c.user.id, { amount: "1.00" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(repo.softDelete(t.id, c.user.id)).rejects.toMatchObject({ statusCode: 409 });

    expect(await getBalance(c.account.id)).toBe("900.00");
    expect(await repo.findById(t.id, c.user.id)).not.toBeNull();
  });

  it("continua permitindo consultar o histórico", async () => {
    const c = await seedFinancialContext();
    const t = await repo.create(c.expense("100.00"));
    await setActive(c.account.id, false);

    expect((await repo.findById(t.id, c.user.id))?.account.isActive).toBe(false);
    expect((await repo.list({ userId: c.user.id, limit: 10, offset: 0 })).total).toBe(1);
  });

  it("o job não processa pendentes da conta inativa e as efetiva após a reativação", async () => {
    const c = await seedFinancialContext();
    await pending(c, "expense", "100.00");
    await setActive(c.account.id, false);

    expect(await repo.processDue(100)).toBe(0);
    expect(await getBalance(c.account.id)).toBe("1000.00");

    await setActive(c.account.id, true);

    expect(await repo.processDue(100)).toBe(1);
    expect(await getBalance(c.account.id)).toBe("900.00");
  });
});

describe("concorrência (Postgres)", () => {
  it("receitas e despesas simultâneas não perdem atualizações de saldo", async () => {
    const c = await seedFinancialContext();

    await Promise.all([
      ...Array.from({ length: 5 }, () => repo.create(c.income("10.00"))),
      ...Array.from({ length: 5 }, () => repo.create(c.expense("3.00"))),
    ]);

    expect(await getBalance(c.account.id)).toBe("1035.00");
    const { stored, audited } = await balanceMatchesAudit(c.account.id);
    expect(stored).toBe(audited);
  });

  it("processDue em paralelo aplica cada transação uma única vez", async () => {
    const c = await seedFinancialContext();
    for (let i = 0; i < 20; i++) await pending(c, "income", "10.00");

    const results = await Promise.all([repo.processDue(100), repo.processDue(100), repo.processDue(100)]);
    let total = results.reduce((sum, n) => sum + n, 0);
    let rest: number;
    do {
      rest = await repo.processDue(100);
      total += rest;
    } while (rest > 0);

    expect(total).toBe(20);
    expect(await getBalance(c.account.id)).toBe("1200.00");
  });

  it("dois updates simultâneos na mesma transação não corrompem o saldo", async () => {
    const c = await seedFinancialContext();
    const t = await repo.create(c.income("100.00"));

    await Promise.all([
      repo.update(t.id, c.user.id, { amount: "200.00" }),
      repo.update(t.id, c.user.id, { amount: "300.00" }),
    ]);

    const final = await repo.findById(t.id, c.user.id);
    expect(["200.00", "300.00"]).toContain(final?.amount);
    const { stored, audited } = await balanceMatchesAudit(c.account.id);
    expect(stored).toBe(audited);
  });

  it("processDue concorrente com a exclusão da mesma pendente mantém o saldo coerente", async () => {
    for (let i = 0; i < 5; i++) {
      const c = await seedFinancialContext();
      const t = await pending(c, "expense", "100.00");

      await Promise.all([repo.processDue(100), repo.softDelete(t.id, c.user.id)]);

      expect(await repo.findById(t.id, c.user.id)).toBeNull();
      expect(await getBalance(c.account.id)).toBe("1000.00");
      const { stored, audited } = await balanceMatchesAudit(c.account.id);
      expect(stored).toBe(audited);
    }
  });

  it("desativar a conta versus cadastrar transação: nunca entra transação depois da desativação", async () => {
    for (let i = 0; i < 5; i++) {
      const c = await seedFinancialContext();

      const [deactivate, created] = await Promise.allSettled([
        accounts.update(c.user.id, { isActive: false }),
        repo.create(c.expense("100.00")),
      ]);

      expect(deactivate.status).toBe("fulfilled");
      expect((await getAccount(c.account.id))?.isActive).toBe(false);

      if (created.status === "fulfilled") {
        expect(await getBalance(c.account.id)).toBe("900.00");
      } else {
        expect((created.reason as { statusCode?: number }).statusCode).toBe(409);
        expect(await getBalance(c.account.id)).toBe("1000.00");
        expect(await countTransactions(c.account.id)).toBe(0);
      }
      const { stored, audited } = await balanceMatchesAudit(c.account.id);
      expect(stored).toBe(audited);
    }
  });

  it("excluir a conta versus cadastrar transação: ou existem as duas coisas, ou nenhuma", async () => {
    for (let i = 0; i < 5; i++) {
      const c = await seedFinancialContext();

      const [del, created] = await Promise.allSettled([
        accounts.delete(c.user.id),
        repo.create(c.expense("100.00")),
      ]);

      if (del.status === "fulfilled") {
        expect(created.status).toBe("rejected");
        expect(await getAccount(c.account.id)).toBeUndefined();
        expect(await countTransactions(c.account.id)).toBe(0);
      } else {
        expect(pgCode(del.reason)).toBe("23503");
        expect(created.status).toBe("fulfilled");
        expect(await getAccount(c.account.id)).toBeDefined();
        expect(await countTransactions(c.account.id)).toBe(1);
        expect(await getBalance(c.account.id)).toBe("900.00");
      }
    }
  });
});