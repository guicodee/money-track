import { TransactionRepository } from "@src/repositories/implementations/transaction-repository";
import { beforeEach, describe, expect, it } from "vitest";
import {
  FUTURE, PAST, balanceMatchesAudit, countTransactions, getBalance, rejectionCode,
  seedFinancialContext, seedRawTransaction,
} from "../../factories/seed";
import { resetDatabase } from "../../setup/db";

describe("TransactionRepository: saldo (Postgres)", () => {
  const repo = new TransactionRepository();

  beforeEach(resetDatabase);

  describe("create", () => {
    it("receita vencida soma ao saldo e fica EFFECTIVE", async () => {
      const c = await seedFinancialContext();

      const t = await repo.create(c.income("500.00"));

      expect(t.status).toBe("EFFECTIVE");
      expect(await getBalance(c.account.id)).toBe("1500.00");
    });

    it("despesa vencida subtrai do saldo", async () => {
      const c = await seedFinancialContext();

      await repo.create(c.expense("200.50"));

      expect(await getBalance(c.account.id)).toBe("799.50");
    });

    it("transação futura fica PENDING e não altera o saldo", async () => {
      const c = await seedFinancialContext();

      const t = await repo.create(c.expense("100.00", { occurredAt: FUTURE }));

      expect(t.status).toBe("PENDING");
      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("transferência não altera o saldo, não tem status nem categoria", async () => {
      const c = await seedFinancialContext();

      const t = await repo.create(c.transfer("300.00"));

      expect(t.status).toBeNull();
      expect(t.category).toBeNull();
      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("permite saldo negativo", async () => {
      const c = await seedFinancialContext();

      await repo.create(c.expense("1500.00"));

      expect(await getBalance(c.account.id)).toBe("-500.00");
    });

    it("soma decimais sem erro de ponto flutuante (0.10 + 0.20 = 0.30)", async () => {
      const c = await seedFinancialContext("0.00");

      await repo.create(c.income("0.10"));
      await repo.create(c.income("0.20"));

      expect(await getBalance(c.account.id)).toBe("0.30");
    });

    it("não vaza userId nem appliedAt na resposta e traz conta e categoria aninhadas", async () => {
      const c = await seedFinancialContext();

      const t = await repo.create(c.expense("10.00"));

      expect(t).not.toHaveProperty("userId");
      expect(t).not.toHaveProperty("appliedAt");
      expect(t.account.id).toBe(c.account.id);
      expect(t.category?.id).toBe(c.expenseCat.id);
    });

    it("conta de outro usuário falha com 404 e não grava nada", async () => {
      const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];

      await expect(
        repo.create({ ...a.expense("10.00"), accountId: b.account.id }),
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(await countTransactions(b.account.id)).toBe(0);
      expect(await getBalance(b.account.id)).toBe("1000.00");
    });
  });

  describe("update", () => {
    it("alterar o valor de uma efetivada aplica só a diferença", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00")); 

      await repo.update(t.id, c.user.id, { amount: "800.00" });

      expect(await getBalance(c.account.id)).toBe("1800.00");
    });

    it("receita -> despesa reverte o impacto antigo e aplica o novo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00")); 

      await repo.update(t.id, c.user.id, { operationType: "EXPENSE", categoryId: c.expenseCat.id });

      expect(await getBalance(c.account.id)).toBe("500.00");
    });

    it("efetivada -> data futura volta a PENDING e reverte o saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00"));

      const updated = await repo.update(t.id, c.user.id, { occurredAt: FUTURE });

      expect(updated?.status).toBe("PENDING");
      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("pendente -> data passada é efetivada e aplica o saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("200.00", { occurredAt: FUTURE }));

      const updated = await repo.update(t.id, c.user.id, { occurredAt: PAST });

      expect(updated?.status).toBe("EFFECTIVE");
      expect(await getBalance(c.account.id)).toBe("800.00");
    });

    it("efetivada -> TRANSFER reverte o saldo, remove a categoria e zera o status", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("200.00"));

      const updated = await repo.update(t.id, c.user.id, { operationType: "TRANSFER", categoryId: null });

      expect(updated?.status).toBeNull();
      expect(updated?.category).toBeNull();
      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("TRANSFER -> despesa passa a impactar o saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.transfer("300.00"));

      await repo.update(t.id, c.user.id, { operationType: "EXPENSE", categoryId: c.expenseCat.id });

      expect(await getBalance(c.account.id)).toBe("700.00");
    });

    it("alterar o valor de uma pendente não mexe no saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("100.00", { occurredAt: FUTURE }));

      await repo.update(t.id, c.user.id, { amount: "999.00" });

      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("editar só a descrição não altera o saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("100.00"));

      const updated = await repo.update(t.id, c.user.id, { description: "Novo" });

      expect(updated?.description).toBe("Novo");
      expect(await getBalance(c.account.id)).toBe("900.00");
    });

    it("retorna null e não altera nada para transação de outro usuário", async () => {
      const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];
      const t = await repo.create(a.income("500.00"));

      expect(await repo.update(t.id, b.user.id, { amount: "1.00" })).toBeNull();

      expect(await getBalance(a.account.id)).toBe("1500.00");
      expect((await repo.findById(t.id, a.user.id))?.amount).toBe("500.00");
    });

    it("retorna null para transação já excluída", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00"));
      await repo.softDelete(t.id, c.user.id);

      expect(await repo.update(t.id, c.user.id, { amount: "1.00" })).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("efetivada: reverte o saldo e some das consultas", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("200.00")); 

      expect(await repo.softDelete(t.id, c.user.id)).toBe(true);

      expect(await getBalance(c.account.id)).toBe("1000.00");
      expect(await repo.findById(t.id, c.user.id)).toBeNull();
      const list = await repo.list({ userId: c.user.id, limit: 10, offset: 0 });
      expect(list.total).toBe(0);
    });

    it("pendente e transferência: não alteram o saldo", async () => {
      const c = await seedFinancialContext();
      const pending = await repo.create(c.expense("100.00", { occurredAt: FUTURE }));
      const transfer = await repo.create(c.transfer("300.00"));

      await repo.softDelete(pending.id, c.user.id);
      await repo.softDelete(transfer.id, c.user.id);

      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("não permite exclusão duplicada nem reverte o saldo duas vezes", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.expense("200.00"));

      expect(await repo.softDelete(t.id, c.user.id)).toBe(true);
      expect(await repo.softDelete(t.id, c.user.id)).toBe(false);

      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("não exclui transação de outro usuário", async () => {
      const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];
      const t = await repo.create(a.expense("200.00"));

      expect(await repo.softDelete(t.id, b.user.id)).toBe(false);

      expect(await repo.findById(t.id, a.user.id)).not.toBeNull();
      expect(await getBalance(a.account.id)).toBe("800.00");
    });
  });

  describe("consistência após várias operações", () => {
    it("o saldo armazenado bate com o recalculado do zero", async () => {
      const c = await seedFinancialContext();
      const uid = c.user.id;

      const a = await repo.create(c.income("100.10"));
      const b = await repo.create(c.expense("0.30"));
      const d = await repo.create(c.expense("20.00", { occurredAt: FUTURE }));
      await repo.create(c.transfer("999.00"));
      await repo.update(a.id, uid, { amount: "250.55" });
      await repo.update(d.id, uid, { occurredAt: PAST });
      await repo.softDelete(b.id, uid);

      expect(await getBalance(c.account.id)).toBe("1230.55");
      const { stored, audited } = await balanceMatchesAudit(c.account.id);
      expect(stored).toBe(audited);
    });
  });

  describe("atomicidade (rollback)", () => {
    it("update que viola constraint DEPOIS do ajuste de saldo desfaz tudo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00")); 

      const code = await rejectionCode(repo.update(t.id, c.user.id, { operationType: "TRANSFER" }));

      expect(code).toBe("23514");
      expect(await getBalance(c.account.id)).toBe("1500.00");
      expect(await repo.findById(t.id, c.user.id)).toMatchObject({
        operationType: "INCOME",
        amount: "500.00",
        status: "EFFECTIVE",
      });
    });

    it("update com valor zero (viola amount > 0) desfaz o ajuste de saldo", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00"));

      const code = await rejectionCode(repo.update(t.id, c.user.id, { amount: "0.00" }));

      expect(code).toBe("23514");
      expect(await getBalance(c.account.id)).toBe("1500.00");
    });

    it("create com categoria de outro usuário é rejeitado (404) sem deixar linha nem alterar o saldo", async () => {
      const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];

      await expect(repo.create({ ...a.expense("10.00"), categoryId: b.expenseCat.id }))
        .rejects.toMatchObject({ statusCode: 404 });

      expect(await countTransactions(a.account.id)).toBe(0);
      expect(await getBalance(a.account.id)).toBe("1000.00");
    });

    it("create com categoria de tipo incompatível é rejeitado dentro do lock (400) sem alterar o saldo", async () => {
      const c = await seedFinancialContext();

      await expect(repo.create(c.expense("10.00", { categoryId: c.incomeCat.id })))
        .rejects.toMatchObject({ statusCode: 400 });

      expect(await countTransactions(c.account.id)).toBe(0);
      expect(await getBalance(c.account.id)).toBe("1000.00");
    });

    it("update para categoria de tipo incompatível é rejeitado (400) e nada muda", async () => {
      const c = await seedFinancialContext();
      const t = await repo.create(c.income("500.00")); // 1500

      await expect(repo.update(t.id, c.user.id, { operationType: "EXPENSE", categoryId: c.incomeCat.id }))
        .rejects.toMatchObject({ statusCode: 400 });

      expect(await getBalance(c.account.id)).toBe("1500.00");
    });
  });

  describe("constraints do banco (insert direto)", () => {
    it("rejeita valor zero ou negativo", async () => {
      const c = await seedFinancialContext();
      expect(await rejectionCode(seedRawTransaction(c.expense("0.00")))).toBe("23514");
      expect(await rejectionCode(seedRawTransaction(c.expense("-1.00")))).toBe("23514");
    });

    it("rejeita transferência com categoria", async () => {
      const c = await seedFinancialContext();
      expect(
        await rejectionCode(seedRawTransaction({ ...c.transfer("10.00"), categoryId: c.expenseCat.id })),
      ).toBe("23514");
    });

    it("rejeita receita/despesa sem categoria", async () => {
      const c = await seedFinancialContext();
      expect(await rejectionCode(seedRawTransaction({ ...c.expense("10.00"), categoryId: null }))).toBe("23514");
    });

    it("rejeita transferência marcada como aplicada", async () => {
      const c = await seedFinancialContext();
      expect(await rejectionCode(seedRawTransaction({ ...c.transfer("10.00"), appliedAt: PAST }))).toBe("23514");
    });

    it("rejeita transação excluída e aplicada ao mesmo tempo", async () => {
      const c = await seedFinancialContext();
      expect(
        await rejectionCode(seedRawTransaction({ ...c.expense("10.00"), appliedAt: PAST, deletedAt: PAST })),
      ).toBe("23514");
    });

    it("rejeita conta ou categoria de outro usuário (FK composta)", async () => {
      const [a, b] = [await seedFinancialContext(), await seedFinancialContext()];

      expect(await rejectionCode(seedRawTransaction({ ...a.expense("10.00"), accountId: b.account.id }))).toBe("23503");
      expect(await rejectionCode(seedRawTransaction({ ...a.expense("10.00"), categoryId: b.expenseCat.id }))).toBe("23503");
    });
  });
});