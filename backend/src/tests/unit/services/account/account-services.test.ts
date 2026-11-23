import { CreateAccountService } from "@src/services/account/create-account.service";
import { DeleteAccountService } from "@src/services/account/delete-account.service";
import { GetMyAccountService } from "@src/services/account/get-my-account.service";
import { UpdateAccountService } from "@src/services/account/update-account.service";
import { describe, expect, it, vi } from "vitest";
import { makeAccount } from "../../../factories/account.factory";

const makeRepo = () => ({
  create: vi.fn(),
  findByUserId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  hasTransactions: vi.fn(),
});

describe("CreateAccountService", () => {
  const input = { userId: 1, name: "Principal", initialBalance: "100.00", currency: "BRL" as const };

  it("cria a conta quando o usuário ainda não tem uma", async () => {
    const repo = makeRepo();
    const created = makeAccount({ userId: 1 });
    repo.findByUserId.mockResolvedValue(null);
    repo.create.mockResolvedValue(created);

    const result = await new CreateAccountService(repo as any).execute(input);

    expect(repo.create).toHaveBeenCalledWith(input);
    expect(result).toEqual({ account: created });
  });

  it("rejeita com 409 quando o usuário já possui conta, sem criar outra", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(makeAccount({ userId: 1 }));

    await expect(new CreateAccountService(repo as any).execute(input)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("converte a violação de unicidade do banco (corrida) em 409", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(null);
    repo.create.mockRejectedValue({ cause: { code: "23505" } });

    await expect(new CreateAccountService(repo as any).execute(input)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("não esconde erros inesperados do banco", async () => {
    const repo = makeRepo();
    const boom = new Error("db down");
    repo.findByUserId.mockResolvedValue(null);
    repo.create.mockRejectedValue(boom);

    await expect(new CreateAccountService(repo as any).execute(input)).rejects.toBe(boom);
  });
});

describe("GetMyAccountService", () => {
  it("retorna a conta do usuário autenticado", async () => {
    const repo = makeRepo();
    const account = makeAccount({ userId: 5 });
    repo.findByUserId.mockResolvedValue(account);

    const result = await new GetMyAccountService(repo as any).execute(5);

    expect(repo.findByUserId).toHaveBeenCalledWith(5);
    expect(result).toEqual({ account });
  });

  it("lança 404 quando o usuário não tem conta", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(null);

    await expect(new GetMyAccountService(repo as any).execute(5)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("UpdateAccountService", () => {
  it("lança 404 e não atualiza quando o usuário não tem conta", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(null);

    await expect(
      new UpdateAccountService(repo as any).execute(5, { name: "Novo" }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("atualiza escopado pelo userId autenticado e retorna a conta atualizada", async () => {
    const repo = makeRepo();
    const updated = makeAccount({ userId: 5, name: "Novo" });
    repo.findByUserId.mockResolvedValue(makeAccount({ userId: 5 }));
    repo.update.mockResolvedValue(updated);

    const result = await new UpdateAccountService(repo as any).execute(5, { name: "Novo" });

    expect(repo.update).toHaveBeenCalledWith(5, { name: "Novo" });
    expect(result).toEqual({ account: updated });
  });

  it("permite desativar e reativar a conta", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(makeAccount({ userId: 5 }));
    repo.update.mockResolvedValue(makeAccount({ userId: 5, isActive: false }));

    await new UpdateAccountService(repo as any).execute(5, { isActive: false });

    expect(repo.update).toHaveBeenCalledWith(5, { isActive: false });
  });
});

describe("DeleteAccountService", () => {
  it("lança 404 quando o usuário não tem conta", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(null);

    await expect(new DeleteAccountService(repo as any).execute(5)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("bloqueia com 409 quando há transações, consultando pelo id da conta", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(makeAccount({ id: 42, userId: 5 }));
    repo.hasTransactions.mockResolvedValue(true);

    await expect(new DeleteAccountService(repo as any).execute(5)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repo.hasTransactions).toHaveBeenCalledWith(42);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("exclui a conta quando não há transações", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(makeAccount({ id: 42, userId: 5 }));
    repo.hasTransactions.mockResolvedValue(false);

    await new DeleteAccountService(repo as any).execute(5);

    expect(repo.delete).toHaveBeenCalledWith(5);
  });

  it("converte a violação de FK (transação criada no meio) em 409", async () => {
    const repo = makeRepo();
    repo.findByUserId.mockResolvedValue(makeAccount({ id: 42, userId: 5 }));
    repo.hasTransactions.mockResolvedValue(false);
    repo.delete.mockRejectedValue({ cause: { code: "23503" } });

    await expect(new DeleteAccountService(repo as any).execute(5)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("não esconde erros inesperados do banco", async () => {
    const repo = makeRepo();
    const boom = new Error("db down");
    repo.findByUserId.mockResolvedValue(makeAccount({ userId: 5 }));
    repo.hasTransactions.mockResolvedValue(false);
    repo.delete.mockRejectedValue(boom);

    await expect(new DeleteAccountService(repo as any).execute(5)).rejects.toBe(boom);
  });
});