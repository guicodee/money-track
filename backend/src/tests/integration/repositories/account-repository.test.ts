import { db } from "@src/db";
import { accountTable } from "@src/db/schema/account";
import { usersTable } from "@src/db/schema/users";
import { AccountRepository } from "@src/repositories/implementations/account-repository";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import {
  getAccount,
  PAST,
  rejectionCode, seedAccount, seedFinancialContext, seedRawTransaction, seedUser,
} from "../../factories/seed";
import { resetDatabase } from "../../setup/db";

describe("AccountRepository (Postgres)", () => {
  const repo = new AccountRepository();

  beforeEach(resetDatabase);

  describe("create", () => {
    it.each(["1000.00", "0.00", "-50.25"])(
      "grava currentBalance igual ao initialBalance (%s)",
      async (initialBalance) => {
        const user = await seedUser();

        const account = await repo.create({ userId: user.id, name: "Principal", initialBalance, currency: "BRL" });

        expect(account.initialBalance).toBe(initialBalance);
        expect(account.currentBalance).toBe(initialBalance);
        expect(account.isActive).toBe(true);
        expect(account.userId).toBe(user.id);
      },
    );

    it("persiste exatamente o que retorna", async () => {
      const user = await seedUser();
      const created = await repo.create({ userId: user.id, name: "USD", initialBalance: "10.00", currency: "USD" });

      expect(await repo.findByUserId(user.id)).toEqual(created);
    });

    it("rejeita uma segunda conta para o mesmo usuário, mesmo com nome diferente", async () => {
      const user = await seedUser();
      await repo.create({ userId: user.id, name: "A", initialBalance: "0.00", currency: "BRL" });

      const code = await rejectionCode(
        repo.create({ userId: user.id, name: "B", initialBalance: "0.00", currency: "BRL" }),
      );

      expect(code).toBe("23505");
    });

    it("permite o mesmo nome para usuários diferentes", async () => {
      const [a, b] = [await seedUser(), await seedUser()];
      await repo.create({ userId: a.id, name: "Principal", initialBalance: "0.00", currency: "BRL" });

      await expect(
        repo.create({ userId: b.id, name: "Principal", initialBalance: "0.00", currency: "BRL" }),
      ).resolves.toBeDefined();
    });

    it("rejeita usuário inexistente (FK)", async () => {
      const code = await rejectionCode(
        repo.create({ userId: 999999, name: "X", initialBalance: "0.00", currency: "BRL" }),
      );
      expect(code).toBe("23503");
    });
  });

  describe("findByUserId", () => {
    it("retorna null para usuário sem conta", async () => {
      const user = await seedUser();
      expect(await repo.findByUserId(user.id)).toBeNull();
    });

    it("retorna só a conta do próprio usuário", async () => {
      const [a, b] = [await seedUser(), await seedUser()];
      const accA = await seedAccount(a.id, { name: "A" });
      await seedAccount(b.id, { name: "B" });

      expect((await repo.findByUserId(a.id))?.id).toBe(accA.id);
    });
  });

  describe("update", () => {
    it("recalcula o saldo atual preservando o efeito das transações (1000/1300 -> 1500 = 1800)", async () => {
      const user = await seedUser();
      const account = await seedAccount(user.id, { initialBalance: "1000.00" });
      await db.update(accountTable).set({ currentBalance: "1300.00" }).where(eq(accountTable.id, account.id));

      const updated = await repo.update(user.id, { initialBalance: "1500.00" });

      expect(updated.initialBalance).toBe("1500.00");
      expect(updated.currentBalance).toBe("1800.00");
    });

    it("recalcula corretamente ao reduzir para valor negativo", async () => {
      const user = await seedUser();
      await seedAccount(user.id, { initialBalance: "100.00" });

      const updated = await repo.update(user.id, { initialBalance: "-50.00" });

      expect(updated.currentBalance).toBe("-50.00");
    });

    it("não mexe nos saldos quando initialBalance não é enviado", async () => {
      const user = await seedUser();
      const account = await seedAccount(user.id, { initialBalance: "1000.00" });
      await db.update(accountTable).set({ currentBalance: "1300.00" }).where(eq(accountTable.id, account.id));

      const updated = await repo.update(user.id, { name: "Novo nome" });

      expect(updated.name).toBe("Novo nome");
      expect(updated.initialBalance).toBe("1000.00");
      expect(updated.currentBalance).toBe("1300.00");
    });

    it("desativa e reativa a conta", async () => {
      const user = await seedUser();
      await seedAccount(user.id);

      expect((await repo.update(user.id, { isActive: false })).isActive).toBe(false);
      expect((await repo.update(user.id, { isActive: true })).isActive).toBe(true);
    });

    it("afeta somente a conta do usuário informado", async () => {
      const [a, b] = [await seedUser(), await seedUser()];
      await seedAccount(a.id, { name: "A" });
      const accB = await seedAccount(b.id, { name: "B" });

      await repo.update(a.id, { name: "A2", isActive: false });

      const untouched = await getAccount(accB.id);
      expect(untouched?.name).toBe("B");
      expect(untouched?.isActive).toBe(true);
    });

    it("estouro de numeric(14,2) falha com 22003 e não altera nada", async () => {
      const user = await seedUser();
      const account = await seedAccount(user.id, { initialBalance: "0.00" });
      await db.update(accountTable).set({ currentBalance: "999999999999.00" }).where(eq(accountTable.id, account.id));

      const code = await rejectionCode(repo.update(user.id, { initialBalance: "999999999999.00" }));

      expect(code).toBe("22003");
      const after = await getAccount(account.id);
      expect(after?.initialBalance).toBe("0.00");
      expect(after?.currentBalance).toBe("999999999999.00");
    });
  });

  describe("hasTransactions", () => {
    it("é false para conta sem transações", async () => {
      const c = await seedFinancialContext();
      expect(await repo.hasTransactions(c.account.id)).toBe(false);
    });

    it("é true com transação e continua true se ela foi excluída logicamente", async () => {
      const c = await seedFinancialContext();
      await seedRawTransaction({ ...c.expense("10.00"), deletedAt: new Date() });

      expect(await repo.hasTransactions(c.account.id)).toBe(true);
    });
  });

  describe("delete e integridade referencial", () => {
    it("exclui conta sem transações", async () => {
      const user = await seedUser();
      await seedAccount(user.id);

      await repo.delete(user.id);

      expect(await repo.findByUserId(user.id)).toBeNull();
    });

    it("conta com transações não pode ser excluída (FK restrict) e o histórico fica intacto", async () => {
      const c = await seedFinancialContext();
      await seedRawTransaction({ ...c.expense("10.00"), occurredAt: PAST, appliedAt: PAST });

      expect(await rejectionCode(repo.delete(c.user.id))).toBe("23503");
      expect(await getAccount(c.account.id)).toBeDefined();
      expect(await repo.hasTransactions(c.account.id)).toBe(true);
    });

    it("usuário com conta não pode ser excluído (FK restrict), sem deixar conta órfã", async () => {
      const user = await seedUser();
      await seedAccount(user.id);

      const code = await rejectionCode(db.delete(usersTable).where(eq(usersTable.id, user.id)).execute());

      expect(code).toBe("23503");
      expect(await repo.findByUserId(user.id)).not.toBeNull();
    });
  });
});