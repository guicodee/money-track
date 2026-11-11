import { AssertCategoryOperationService } from "@src/services/category/assert-category-operation.service";
import { CreateCategoryService } from "@src/services/category/create-category.service";
import { DeleteCategoryService } from "@src/services/category/delete-category.service";
import { GetCategoryService } from "@src/services/category/get-category.service";
import { ListCategoriesService } from "@src/services/category/list-categories.sevice";
import { UpdateCategoryService } from "@src/services/category/update-category.service";
import { describe, expect, it, vi } from "vitest";
import { makeCategory } from "../../../factories/category.factory";

const makeRepo = () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findDuplicate: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  hasTransactions: vi.fn(),
});
const uniqueViolation = { cause: { code: "23505" } };
const fkViolation = { cause: { code: "23503" } };

describe("CreateCategoryService", () => {
  const input = { userId: 1, description: "Mercado", categoryType: "EXPENSE" as const };

  it("verifica duplicata com usuário, descrição e tipo, e só então cria", async () => {
    const repo = makeRepo();
    const created = makeCategory(input);
    repo.findDuplicate.mockResolvedValue(null);
    repo.create.mockResolvedValue(created);

    const result = await new CreateCategoryService(repo as any).execute(input);

    expect(repo.findDuplicate).toHaveBeenCalledWith(input);
    expect(repo.create).toHaveBeenCalledWith(input);
    expect(result).toBe(created);
  });

  it("rejeita duplicata com 409 sem criar", async () => {
    const repo = makeRepo();
    repo.findDuplicate.mockResolvedValue(makeCategory());

    await expect(new CreateCategoryService(repo as any).execute(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("converte a violação de unicidade do banco (corrida) em 409", async () => {
    const repo = makeRepo();
    repo.findDuplicate.mockResolvedValue(null);
    repo.create.mockRejectedValue(uniqueViolation);

    await expect(new CreateCategoryService(repo as any).execute(input)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("não esconde erros inesperados", async () => {
    const repo = makeRepo();
    const boom = new Error("db down");
    repo.findDuplicate.mockResolvedValue(null);
    repo.create.mockRejectedValue(boom);

    await expect(new CreateCategoryService(repo as any).execute(input)).rejects.toBe(boom);
  });
});

describe("ListCategoriesService", () => {
  it("calcula limit, offset e totalPages a partir da página", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue({ items: [makeCategory()], total: 25 });

    const result = await new ListCategoriesService(repo as any).execute({ userId: 7, page: 3 });

    expect(repo.list).toHaveBeenCalledWith({ userId: 7, type: undefined, limit: 10, offset: 20 });
    expect(result).toMatchObject({ page: 3, limit: 10, total: 25, totalPages: 3 });
  });

  it("repassa o filtro de tipo ao repository", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue({ items: [], total: 0 });

    await new ListCategoriesService(repo as any).execute({ userId: 7, type: "INCOME", page: 1 });

    expect(repo.list).toHaveBeenCalledWith(expect.objectContaining({ type: "INCOME", offset: 0 }));
  });

  it("sem itens: data vazia e totalPages 0", async () => {
    const repo = makeRepo();
    repo.list.mockResolvedValue({ items: [], total: 0 });

    const result = await new ListCategoriesService(repo as any).execute({ userId: 7, page: 1 });

    expect(result).toEqual({ data: [], page: 1, limit: 10, total: 0, totalPages: 0 });
  });

  it("10 itens cabem em 1 página; 11 exigem 2", async () => {
    const repo = makeRepo();
    const sut = new ListCategoriesService(repo as any);

    repo.list.mockResolvedValue({ items: [], total: 10 });
    expect((await sut.execute({ userId: 1, page: 1 })).totalPages).toBe(1);
    repo.list.mockResolvedValue({ items: [], total: 11 });
    expect((await sut.execute({ userId: 1, page: 1 })).totalPages).toBe(2);
  });
});

describe("GetCategoryService", () => {
  it("consulta escopado pelo usuário e retorna a categoria", async () => {
    const repo = makeRepo();
    const category = makeCategory({ id: 5, userId: 9 });
    repo.findById.mockResolvedValue(category);

    expect(await new GetCategoryService(repo as any).execute({ id: 5, userId: 9 })).toBe(category);
    expect(repo.findById).toHaveBeenCalledWith(5, 9);
  });

  it("404 quando não existe ou é de outro usuário", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);

    await expect(new GetCategoryService(repo as any).execute({ id: 5, userId: 9 })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("UpdateCategoryService", () => {
  const current = makeCategory({ id: 3, userId: 1, description: "Mercado", categoryType: "EXPENSE" });

  it("404 quando a categoria não existe, sem atualizar", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);

    await expect(new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, description: "X" }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("sem mudança real: devolve a atual sem consultar nem gravar nada", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);

    const result = await new UpdateCategoryService(repo as any).execute({
      id: 3, userId: 1, description: "Mercado", categoryType: "EXPENSE",
    });

    expect(result).toBe(current);
    expect(repo.hasTransactions).not.toHaveBeenCalled();
    expect(repo.findDuplicate).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("só renomear não consulta transações e mantém o tipo", async () => {
    const repo = makeRepo();
    const updated = makeCategory({ description: "Super" });
    repo.findById.mockResolvedValue(current);
    repo.findDuplicate.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    const result = await new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, description: "Super" });

    expect(repo.hasTransactions).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalledWith(3, 1, { description: "Super", categoryType: "EXPENSE" });
    expect(result).toBe(updated);
  });

  it("trocar o tipo com transações vinculadas: 409 sem checar duplicata nem atualizar", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.hasTransactions.mockResolvedValue(true);

    await expect(new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, categoryType: "INCOME" }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findDuplicate).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("trocar o tipo checa duplicata no tipo de DESTINO, excluindo a própria categoria", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.hasTransactions.mockResolvedValue(false);
    repo.findDuplicate.mockResolvedValue(makeCategory({ categoryType: "INCOME" }));

    await expect(new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, categoryType: "INCOME" }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(repo.findDuplicate).toHaveBeenCalledWith({
      userId: 1, description: "Mercado", categoryType: "INCOME", excludeId: 3,
    });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("renomear só a caixa ('mercado') é permitido: a própria categoria é excluída da checagem", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.findDuplicate.mockResolvedValue(null);
    repo.update.mockResolvedValue(makeCategory({ description: "mercado" }));

    await new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, description: "mercado" });

    expect(repo.findDuplicate).toHaveBeenCalledWith(expect.objectContaining({ excludeId: 3 }));
    expect(repo.update).toHaveBeenCalled();
  });

  it("renomear para nome já usado no mesmo tipo: 409", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.findDuplicate.mockResolvedValue(makeCategory());

    await expect(new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, description: "Lazer" }))
      .rejects.toMatchObject({ statusCode: 409 });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("update devolvendo null (corrida) vira 404", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.findDuplicate.mockResolvedValue(null);
    repo.update.mockResolvedValue(null);

    await expect(new UpdateCategoryService(repo as any).execute({ id: 3, userId: 1, description: "X" }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("unicidade do banco (corrida) vira 409 e erro inesperado propaga", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(current);
    repo.findDuplicate.mockResolvedValue(null);
    const sut = new UpdateCategoryService(repo as any);

    repo.update.mockRejectedValue(uniqueViolation);
    await expect(sut.execute({ id: 3, userId: 1, description: "X" })).rejects.toMatchObject({ statusCode: 409 });

    const boom = new Error("db down");
    repo.update.mockRejectedValue(boom);
    await expect(sut.execute({ id: 3, userId: 1, description: "X" })).rejects.toBe(boom);
  });
});

describe("DeleteCategoryService", () => {
  const category = makeCategory({ id: 4, userId: 2 });

  it("404 quando não existe, sem excluir", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);

    await expect(new DeleteCategoryService(repo as any).execute({ id: 4, userId: 2 })).rejects.toMatchObject({ statusCode: 404 });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("com transações vinculadas: 409 sem excluir", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(category);
    repo.hasTransactions.mockResolvedValue(true);

    await expect(new DeleteCategoryService(repo as any).execute({ id: 4, userId: 2 })).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("exclui escopado pelo usuário quando não há transações", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(category);
    repo.hasTransactions.mockResolvedValue(false);
    repo.delete.mockResolvedValue(true);

    await new DeleteCategoryService(repo as any).execute({ id: 4, userId: 2 });

    expect(repo.hasTransactions).toHaveBeenCalledWith(4, 2);
    expect(repo.delete).toHaveBeenCalledWith(4, 2);
  });

  it("delete devolvendo false (corrida) vira 404", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(category);
    repo.hasTransactions.mockResolvedValue(false);
    repo.delete.mockResolvedValue(false);

    await expect(new DeleteCategoryService(repo as any).execute({ id: 4, userId: 2 })).rejects.toMatchObject({ statusCode: 404 });
  });

  it("violação de FK (transação criada no meio) vira 409; erro inesperado propaga", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(category);
    repo.hasTransactions.mockResolvedValue(false);
    const sut = new DeleteCategoryService(repo as any);

    repo.delete.mockRejectedValue(fkViolation);
    await expect(sut.execute({ id: 4, userId: 2 })).rejects.toMatchObject({ statusCode: 409 });

    const boom = new Error("db down");
    repo.delete.mockRejectedValue(boom);
    await expect(sut.execute({ id: 4, userId: 2 })).rejects.toBe(boom);
  });
});

describe("AssertCategoryOperationService (regra 6)", () => {
  it("TRANSFER é rejeitada com 400 sem consultar o repository", async () => {
    const repo = makeRepo();

    await expect(new AssertCategoryOperationService(repo as any).execute({ categoryId: 1, userId: 1, operationType: "TRANSFER" }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("categoria inexistente ou de outro usuário: 404, consultando com o userId", async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);

    await expect(new AssertCategoryOperationService(repo as any).execute({ categoryId: 8, userId: 3, operationType: "EXPENSE" }))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(repo.findById).toHaveBeenCalledWith(8, 3);
  });

  it.each([
    ["EXPENSE", "INCOME"],
    ["INCOME", "EXPENSE"],
  ] as const)("categoria %s em transação %s: 400", async (categoryType, operationType) => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(makeCategory({ categoryType }));

    await expect(new AssertCategoryOperationService(repo as any).execute({ categoryId: 1, userId: 1, operationType }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it.each(["EXPENSE", "INCOME"] as const)("categoria e operação %s compatíveis: retorna a categoria", async (type) => {
    const repo = makeRepo();
    const category = makeCategory({ categoryType: type });
    repo.findById.mockResolvedValue(category);

    expect(await new AssertCategoryOperationService(repo as any).execute({ categoryId: 1, userId: 1, operationType: type })).toBe(category);
  });
});