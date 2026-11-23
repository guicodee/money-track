import { ListTransactionsService } from "@src/services/transactions/list-transactions.service";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeTransaction } from "../../../factories/transaction.factory";

const iso = (d: Date | undefined) => d?.toISOString();

describe("ListTransactionsService", () => {
  const repo = { list: vi.fn() };
  const sut = new ListTransactionsService(repo as any);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T15:00:00Z"));
    repo.list.mockResolvedValue({ items: [], total: 0 });
  });
  afterEach(() => vi.useRealTimers());

  const lastCall = () => repo.list.mock.calls.at(-1)![0];

  describe("paginação", () => {
    it("calcula limit, offset e totalPages", async () => {
      repo.list.mockResolvedValue({ items: [makeTransaction()], total: 25 });

      const result = await sut.execute({ userId: 7, page: 3 });

      expect(lastCall()).toMatchObject({ userId: 7, limit: 10, offset: 20 });
      expect(result).toMatchObject({ page: 3, limit: 10, total: 25, totalPages: 3 });
    });

    it("sem itens: data vazia e totalPages 0", async () => {
      expect(await sut.execute({ userId: 7, page: 1 })).toEqual({
        data: [], page: 1, limit: 10, total: 0, totalPages: 0,
      });
    });

    it("10 itens cabem em 1 página; 11 exigem 2", async () => {
      repo.list.mockResolvedValue({ items: [], total: 10 });
      expect((await sut.execute({ userId: 1, page: 1 })).totalPages).toBe(1);
      repo.list.mockResolvedValue({ items: [], total: 11 });
      expect((await sut.execute({ userId: 1, page: 1 })).totalPages).toBe(2);
    });
  });

  it("repassa o usuário e os filtros de tipo, conta e categoria ao repository", async () => {
    await sut.execute({ userId: 7, type: "EXPENSE", accountId: 2, categoryId: 3, page: 1 });

    expect(lastCall()).toMatchObject({ userId: 7, type: "EXPENSE", accountId: 2, categoryId: 3 });
  });

  describe("intervalo de datas (fuso America/Sao_Paulo)", () => {
    it("sem datas nem período: sem limites", async () => {
      await sut.execute({ userId: 1, page: 1 });

      expect(lastCall().from).toBeUndefined();
      expect(lastCall().to).toBeUndefined();
    });

    it("startDate e endDate: início do dia inicial até o início do dia seguinte ao final (endDate inclusivo)", async () => {
      await sut.execute({ userId: 1, startDate: "2026-10-01", endDate: "2026-10-31", page: 1 });

      expect(iso(lastCall().from)).toBe("2026-10-01T03:00:00.000Z");
      expect(iso(lastCall().to)).toBe("2026-11-01T03:00:00.000Z");
    });

    it("só startDate: sem limite superior", async () => {
      await sut.execute({ userId: 1, startDate: "2026-10-01", page: 1 });

      expect(iso(lastCall().from)).toBe("2026-10-01T03:00:00.000Z");
      expect(lastCall().to).toBeUndefined();
    });

    it("só endDate: sem limite inferior", async () => {
      await sut.execute({ userId: 1, endDate: "2026-10-31", page: 1 });

      expect(lastCall().from).toBeUndefined();
      expect(iso(lastCall().to)).toBe("2026-11-01T03:00:00.000Z");
    });

    it("endDate virando o mês e o ano não quebra (31/12 -> 01/01)", async () => {
      await sut.execute({ userId: 1, endDate: "2026-12-31", page: 1 });

      expect(iso(lastCall().to)).toBe("2027-01-01T03:00:00.000Z");
    });
  });

  describe("period (do passado até hoje, incluindo hoje)", () => {
    it.each([
      ["7d", "2026-10-29T03:00:00.000Z"],
      ["30d", "2026-10-06T03:00:00.000Z"],
      ["365d", "2025-11-05T03:00:00.000Z"],
    ] as const)("%s começa em %s e termina no fim de hoje", async (period, from) => {
      await sut.execute({ userId: 1, period, page: 1 });

      expect(iso(lastCall().from)).toBe(from);
      expect(iso(lastCall().to)).toBe("2026-11-05T03:00:00.000Z");
    });

    it("23:30 em São Paulo (02:30Z do dia seguinte) ainda conta como o dia 04", async () => {
      vi.setSystemTime(new Date("2026-11-05T02:30:00Z"));

      await sut.execute({ userId: 1, period: "7d", page: 1 });

      expect(iso(lastCall().from)).toBe("2026-10-29T03:00:00.000Z");
      expect(iso(lastCall().to)).toBe("2026-11-05T03:00:00.000Z");
    });

    it("00:30 em São Paulo (03:30Z) já é o dia 05: a janela avança um dia", async () => {
      vi.setSystemTime(new Date("2026-11-05T03:30:00Z"));

      await sut.execute({ userId: 1, period: "7d", page: 1 });

      expect(iso(lastCall().from)).toBe("2026-10-30T03:00:00.000Z");
      expect(iso(lastCall().to)).toBe("2026-11-06T03:00:00.000Z");
    });

    it("transações futuras ficam fora do período (limite superior é o fim de hoje)", async () => {
      await sut.execute({ userId: 1, period: "30d", page: 1 });

      const futureTx = new Date("2026-11-20T03:00:00Z");
      expect(futureTx.getTime()).toBeGreaterThanOrEqual(lastCall().to.getTime());
    });

    it("period prevalece sobre startDate e endDate se os dois chegarem ao service", async () => {
      await sut.execute({ userId: 1, period: "7d", startDate: "2020-01-01", endDate: "2020-01-31", page: 1 });

      expect(iso(lastCall().from)).toBe("2026-10-29T03:00:00.000Z");
    });
  });
});