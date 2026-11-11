import { AppError } from "@src/errors/error";
import { CreateTransactionService } from "@src/services/transactions/create-transaction.service";
import { DeleteTransactionService } from "@src/services/transactions/delete-transaction.service";
import { GetTransactionService } from "@src/services/transactions/get-transaction.service";
import { DUE_BATCH_SIZE, ProcessDueTransactionsService } from "@src/services/transactions/process-due-transactions.service";
import { UpdateTransactionService } from "@src/services/transactions/update-transaction.service";
import { describe, expect, it, vi } from "vitest";
import { makeTransaction } from "../../../factories/transaction.factory";

const makeDeps = () => ({
  repo: {
    findAccount: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    processDue: vi.fn(),
  },
  assertCategory: { execute: vi.fn() },
});

const activeAccount = { id: 1, isActive: true };

describe("CreateTransactionService", () => {
  const base = {
    userId: 1,
    description: "Teste",
    amount: "10.00",
    occurredAt: new Date("2020-01-01T03:00:00Z"),
    accountId: 1,
  };
  const expense = { ...base, operationType: "EXPENSE" as const, categoryId: 5 };
  const income = { ...base, operationType: "INCOME" as const, categoryId: 6 };
  const transfer = { ...base, operationType: "TRANSFER" as const, categoryId: null };

  const build = () => {
    const d = makeDeps();
    d.repo.findAccount.mockResolvedValue(activeAccount);
    d.assertCategory.execute.mockResolvedValue({});
    return { ...d, sut: new CreateTransactionService(d.repo as any, d.assertCategory as any) };
  };

  it("busca a conta escopada pelo usuário e rejeita conta inexistente ou de outro usuário (404)", async () => {
    const { repo, sut } = build();
    repo.findAccount.mockResolvedValue(null);

    await expect(sut.execute(expense)).rejects.toMatchObject({ statusCode: 404 });

    expect(repo.findAccount).toHaveBeenCalledWith(1, 1);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("rejeita conta inativa (409) sem validar categoria nem criar", async () => {
    const { repo, assertCategory, sut } = build();
    repo.findAccount.mockResolvedValue({ id: 1, isActive: false });

    await expect(sut.execute(expense)).rejects.toMatchObject({ statusCode: 409 });

    expect(assertCategory.execute).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each([
    ["despesa", expense, "EXPENSE"],
    ["receita", income, "INCOME"],
  ] as const)("%s: valida a categoria para o tipo e cria com os dados recebidos", async (_l, data, type) => {
    const { repo, assertCategory, sut } = build();
    const created = makeTransaction();
    repo.create.mockResolvedValue(created);

    const result = await sut.execute(data);

    expect(assertCategory.execute).toHaveBeenCalledWith({
      categoryId: data.categoryId,
      userId: 1,
      operationType: type,
    });
    expect(repo.create).toHaveBeenCalledWith(data);
    expect(result).toBe(created);
  });

  it.each([
    ["despesa", { ...expense, categoryId: null }],
    ["receita", { ...income, categoryId: null }],
  ])("%s sem categoria: 400", async (_l, data) => {
    const { repo, sut } = build();

    await expect(sut.execute(data)).rejects.toMatchObject({ statusCode: 400 });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("transferência sem categoria: cria sem consultar o serviço de categoria", async () => {
    const { repo, assertCategory, sut } = build();
    repo.create.mockResolvedValue(makeTransaction({ operationType: "TRANSFER", status: null, category: null }));

    await sut.execute(transfer);

    expect(assertCategory.execute).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(transfer);
  });

  it("transferência com categoria: 400 sem criar", async () => {
    const { repo, sut } = build();

    await expect(sut.execute({ ...transfer, categoryId: 5 })).rejects.toMatchObject({ statusCode: 400 });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("categoria rejeitada pela regra de compatibilidade: propaga o erro e não cria", async () => {
    const { repo, assertCategory, sut } = build();
    assertCategory.execute.mockRejectedValue(new AppError("incompatível", 400));

    await expect(sut.execute(expense)).rejects.toMatchObject({ statusCode: 400 });

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("não esconde erros inesperados do repository", async () => {
    const { repo, sut } = build();
    const boom = new Error("db down");
    repo.create.mockRejectedValue(boom);

    await expect(sut.execute(expense)).rejects.toBe(boom);
  });
});

describe("UpdateTransactionService", () => {
  const current = makeTransaction({
    id: 10,
    operationType: "EXPENSE",
    account: { id: 1, name: "Principal", isActive: true },
    category: { id: 5, description: "Mercado", categoryType: "EXPENSE" },
  });
  const transferCurrent = makeTransaction({
    id: 10,
    operationType: "TRANSFER",
    status: null,
    category: null,
  });

  const build = (found = current) => {
    const d = makeDeps();
    d.repo.findById.mockResolvedValue(found);
    d.repo.findAccount.mockResolvedValue(activeAccount);
    d.repo.update.mockResolvedValue(makeTransaction({ id: 10 }));
    d.assertCategory.execute.mockResolvedValue({});
    return { ...d, sut: new UpdateTransactionService(d.repo as any, d.assertCategory as any) };
  };

  it("404 quando a transação não existe (ou é de outro usuário), sem atualizar", async () => {
    const { repo, sut } = build();
    repo.findById.mockResolvedValue(null);

    await expect(sut.execute({ id: 10, userId: 1, description: "x" })).rejects.toMatchObject({ statusCode: 404 });

    expect(repo.findById).toHaveBeenCalledWith(10, 1);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("editar só campos simples não valida categoria nem conta e não envia tipo/categoria", async () => {
    const { repo, assertCategory, sut } = build();

    await sut.execute({ id: 10, userId: 1, description: "Novo", amount: "99.90" });

    expect(assertCategory.execute).not.toHaveBeenCalled();
    expect(repo.findAccount).not.toHaveBeenCalled();
    const data = repo.update.mock.calls[0][2];
    expect(data).toMatchObject({ description: "Novo", amount: "99.90" });
    expect(data).not.toHaveProperty("operationType");
    expect(data).not.toHaveProperty("categoryId");
  });

  it("reenviar a mesma conta não consulta a conta", async () => {
    const { repo, sut } = build();

    await sut.execute({ id: 10, userId: 1, accountId: 1 });

    expect(repo.findAccount).not.toHaveBeenCalled();
  });

  it("nova conta inexistente ou de outro usuário: 404, sem atualizar", async () => {
    const { repo, sut } = build();
    repo.findAccount.mockResolvedValue(null);

    await expect(sut.execute({ id: 10, userId: 1, accountId: 2 })).rejects.toMatchObject({ statusCode: 404 });

    expect(repo.findAccount).toHaveBeenCalledWith(2, 1);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("nova conta inativa: 409, sem atualizar", async () => {
    const { repo, sut } = build();
    repo.findAccount.mockResolvedValue({ id: 2, isActive: false });

    await expect(sut.execute({ id: 10, userId: 1, accountId: 2 })).rejects.toMatchObject({ statusCode: 409 });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("mudar só o tipo reaproveita a categoria atual na validação de compatibilidade", async () => {
    const { repo, assertCategory, sut } = build();
    assertCategory.execute.mockRejectedValue(new AppError("incompatível", 400));

    await expect(sut.execute({ id: 10, userId: 1, operationType: "INCOME" })).rejects.toMatchObject({ statusCode: 400 });

    expect(assertCategory.execute).toHaveBeenCalledWith({ categoryId: 5, userId: 1, operationType: "INCOME" });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("mudar tipo e categoria juntos: valida o par e envia ambos ao repository", async () => {
    const { repo, assertCategory, sut } = build();

    await sut.execute({ id: 10, userId: 1, operationType: "INCOME", categoryId: 6 });

    expect(assertCategory.execute).toHaveBeenCalledWith({ categoryId: 6, userId: 1, operationType: "INCOME" });
    expect(repo.update).toHaveBeenCalledWith(10, 1, expect.objectContaining({ operationType: "INCOME", categoryId: 6 }));
  });

  it("mudar só a categoria valida contra o tipo atual da transação", async () => {
    const { assertCategory, sut } = build();

    await sut.execute({ id: 10, userId: 1, categoryId: 7 });

    expect(assertCategory.execute).toHaveBeenCalledWith({ categoryId: 7, userId: 1, operationType: "EXPENSE" });
  });

  it("remover a categoria de uma despesa (categoryId null): 400", async () => {
    const { repo, sut } = build();

    await expect(sut.execute({ id: 10, userId: 1, categoryId: null })).rejects.toMatchObject({ statusCode: 400 });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("virar transferência remove a categoria automaticamente e não valida categoria", async () => {
    const { repo, assertCategory, sut } = build();

    await sut.execute({ id: 10, userId: 1, operationType: "TRANSFER" });

    expect(assertCategory.execute).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(10, 1, expect.objectContaining({ operationType: "TRANSFER", categoryId: null }));
  });

  it("virar transferência enviando categoria: 400", async () => {
    const { repo, sut } = build();

    await expect(sut.execute({ id: 10, userId: 1, operationType: "TRANSFER", categoryId: 5 }))
      .rejects.toMatchObject({ statusCode: 400 });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("transferência -> despesa sem informar categoria: 400", async () => {
    const { repo, sut } = build(transferCurrent);

    await expect(sut.execute({ id: 10, userId: 1, operationType: "EXPENSE" })).rejects.toMatchObject({ statusCode: 400 });

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("transferência -> despesa informando categoria: valida e atualiza", async () => {
    const { repo, assertCategory, sut } = build(transferCurrent);

    await sut.execute({ id: 10, userId: 1, operationType: "EXPENSE", categoryId: 5 });

    expect(assertCategory.execute).toHaveBeenCalledWith({ categoryId: 5, userId: 1, operationType: "EXPENSE" });
    expect(repo.update).toHaveBeenCalled();
  });

  it("editar só a descrição de uma transferência não exige categoria", async () => {
    const { repo, sut } = build(transferCurrent);

    await sut.execute({ id: 10, userId: 1, description: "Info" });

    expect(repo.update).toHaveBeenCalled();
  });

  it("repository devolvendo null (corrida com exclusão) vira 404", async () => {
    const { repo, sut } = build();
    repo.update.mockResolvedValue(null);

    await expect(sut.execute({ id: 10, userId: 1, description: "x" })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("devolve a transação atualizada pelo repository", async () => {
    const { repo, sut } = build();
    const updated = makeTransaction({ id: 10, description: "Novo" });
    repo.update.mockResolvedValue(updated);

    expect(await sut.execute({ id: 10, userId: 1, description: "Novo" })).toBe(updated);
  });
});

describe("GetTransactionService", () => {
  it("consulta escopado pelo usuário e devolve a transação", async () => {
    const { repo } = makeDeps();
    const t = makeTransaction({ id: 3 });
    repo.findById.mockResolvedValue(t);

    expect(await new GetTransactionService(repo as any).execute({ id: 3, userId: 9 })).toBe(t);
    expect(repo.findById).toHaveBeenCalledWith(3, 9);
  });

  it("404 quando não existe, é de outro usuário ou foi excluída", async () => {
    const { repo } = makeDeps();
    repo.findById.mockResolvedValue(null);

    await expect(new GetTransactionService(repo as any).execute({ id: 3, userId: 9 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("DeleteTransactionService", () => {
  it("exclui escopado pelo usuário", async () => {
    const { repo } = makeDeps();
    repo.softDelete.mockResolvedValue(true);

    await new DeleteTransactionService(repo as any).execute({ id: 3, userId: 9 });

    expect(repo.softDelete).toHaveBeenCalledWith(3, 9);
  });

  it("404 quando não existe, é de outro usuário ou já foi excluída", async () => {
    const { repo } = makeDeps();
    repo.softDelete.mockResolvedValue(false);

    await expect(new DeleteTransactionService(repo as any).execute({ id: 3, userId: 9 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("propaga o 409 de conta inativa vindo do repository", async () => {
    const { repo } = makeDeps();
    repo.softDelete.mockRejectedValue(new AppError("inativa", 409));

    await expect(new DeleteTransactionService(repo as any).execute({ id: 3, userId: 9 }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("ProcessDueTransactionsService", () => {
  it("processa um lote do tamanho configurado e devolve a quantidade processada", async () => {
    const { repo } = makeDeps();
    repo.processDue.mockResolvedValue(7);

    expect(await new ProcessDueTransactionsService(repo as any).execute()).toBe(7);
    expect(repo.processDue).toHaveBeenCalledWith(DUE_BATCH_SIZE);
  });

  it("propaga falhas para o job decidir o que fazer", async () => {
    const { repo } = makeDeps();
    const boom = new Error("db down");
    repo.processDue.mockRejectedValue(boom);

    await expect(new ProcessDueTransactionsService(repo as any).execute()).rejects.toBe(boom);
  });
});