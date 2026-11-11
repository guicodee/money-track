import { AppError } from "@src/errors/error";
import { DeleteMeService } from "@src/services/users/delete-user.service";
import { GetMeService } from "@src/services/users/get-me.service";
import { LogoutService } from "@src/services/users/logout-service.service";
import { describe, expect, it, vi } from "vitest";
import { makeUser } from "../../../factories/user.factory";

describe("GetMeService", () => {
  it("retorna só id, name, email e createdAt, sem a senha", async () => {
    const user = makeUser();
    const repo = { findById: vi.fn().mockResolvedValue(user) } as any;

    const result = await new GetMeService(repo).execute(user.id);

    expect(result).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
    expect(result).not.toHaveProperty("password");
  });

  it("lança 404 quando o usuário não existe", async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null) } as any;

    await expect(new GetMeService(repo).execute(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("busca o usuário pelo ID informado", async () => {
    const user = makeUser({ id: 7 });
    const repo = { findById: vi.fn().mockResolvedValue(user) } as any;

    await new GetMeService(repo).execute(7);

    expect(repo.findById).toHaveBeenCalledWith(7);
    expect(repo.findById).toHaveBeenCalledTimes(1);
  });

  it("propaga erros do repositório", async () => {
    const error = new Error("Database error");
    const repo = {
      findById: vi.fn().mockRejectedValue(error),
    } as any;

    await expect(new GetMeService(repo).execute(7)).rejects.toBe(error);
  });
});

describe("DeleteMeService", () => {
  it("exclui o usuário existente", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(makeUser({ id: 7 })),
      deleteById: vi.fn(),
    } as any;

    await new DeleteMeService(repo).execute(7);

    expect(repo.deleteById).toHaveBeenCalledWith(7);
  });

  it("lança 404 e não exclui quando o usuário não existe", async () => {
    const repo = { findById: vi.fn().mockResolvedValue(null), deleteById: vi.fn() } as any;

    await expect(new DeleteMeService(repo).execute(7)).rejects.toBeInstanceOf(AppError);
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it("propaga erros ao excluir o usuário", async () => {
    const error = new Error("Database error");

    const repo = {
      findById: vi.fn().mockResolvedValue(makeUser({ id: 7 })),
      deleteById: vi.fn().mockRejectedValue(error),
    } as any;

    await expect(new DeleteMeService(repo).execute(7)).rejects.toBe(error);
  });

  it("converte a violação de FK (usuário com conta ou categorias) em 409", async () => {
    const repo = {
      findById: vi.fn().mockResolvedValue(makeUser({ id: 7 })),
      deleteById: vi.fn().mockRejectedValue({ cause: { code: "23503" } }),
    } as any;

    await expect(new DeleteMeService(repo).execute(7)).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe("LogoutService", () => {
  it("revoga a sessão informada", async () => {
    const repo = { revokeById: vi.fn() } as any;

    await new LogoutService(repo).execute(42);

    expect(repo.revokeById).toHaveBeenCalledWith(42);
  });

  it("propaga erros ao revogar a sessão", async () => {
    const error = new Error("Database error");

    const repo = {
      revokeById: vi.fn().mockRejectedValue(error),
    } as any;

    await expect(new LogoutService(repo).execute(42)).rejects.toBe(error);
  });
});