import { ConflictError } from "@src/errors/error";
import { CreateUserService } from "@src/services/users/create-user.service";
import { makeUser } from "@src/tests/factories/user.factory";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("CreateUserService", () => {
  const usersRepository = { findByEmail: vi.fn(), createUser: vi.fn() };
  const bcrypt = { hash: vi.fn(async (plain: string) => `hashed:${plain}`) };

  let sut: CreateUserService;

  beforeEach(() => {
    sut = new CreateUserService(usersRepository as any, bcrypt as any);
  });

  it("cria o usuário gravando o hash da senha, nunca o texto puro", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createUser.mockImplementation(async (data) => makeUser(data));

    await sut.execute({ name: "Ana", email: "ana@test.com", password: "senha-123" });

    expect(usersRepository.createUser).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@test.com",
      password: "hashed:senha-123",
    });
  });

  it("retorna o usuário criado sem expor a senha", async () => {
    const created = makeUser({ email: "ana@test.com" });
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createUser.mockResolvedValue(created);

    const { user } = await sut.execute({ name: "Ana", email: "ana@test.com", password: "x" });

    expect(user).toEqual({
      id: created.id,
      name: created.name,
      email: created.email,
      createdAt: created.createdAt,
    });
    expect(user).not.toHaveProperty("password");
  });

  it("lança ConflictError quando o e-mail já existe", async () => {
    usersRepository.findByEmail.mockResolvedValue(makeUser({ email: "ana@test.com" }));

    await expect(
      sut.execute({ name: "Ana", email: "ana@test.com", password: "x" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("não gera hash nem grava nada quando o e-mail já existe", async () => {
    usersRepository.findByEmail.mockResolvedValue(makeUser());

    await sut.execute({ name: "Ana", email: "a@test.com", password: "x" }).catch(() => {});

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });

  it("propaga erro quando o repository falha ao consultar o e-mail", async () => {
    usersRepository.findByEmail.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(
      sut.execute({
        name: "Ana",
        email: "ana@test.com",
        password: "senha-123",
      }),
    ).rejects.toThrow("Database error");

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });

  it("não cria usuário quando ocorre erro ao gerar o hash", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    bcrypt.hash.mockRejectedValue(new Error("Bcrypt error"));

    await expect(
      sut.execute({
        name: "Ana",
        email: "ana@test.com",
        password: "senha-123",
      }),
    ).rejects.toThrow("Bcrypt error");

    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });

  it("propaga erro quando o repository falha ao criar usuário", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed:senha-123");
    usersRepository.createUser.mockRejectedValue(
      new Error("Database error"),
    );

    await expect(
      sut.execute({
        name: "Ana",
        email: "ana@test.com",
        password: "senha-123",
      }),
    ).rejects.toThrow("Database error");
  });

  it("gera o hash utilizando a senha recebida", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.createUser.mockImplementation(async (data) =>
      makeUser(data),
    );

    await sut.execute({
      name: "Ana",
      email: "ana@test.com",
      password: "senha-123",
    });

    expect(bcrypt.hash).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).toHaveBeenCalledWith("senha-123");
  });

  it("não gera hash nem grava nada quando o e-mail já existe", async () => {
    usersRepository.findByEmail.mockResolvedValue(makeUser());

    await expect(
      sut.execute({
        name: "Ana",
        email: "a@test.com",
        password: "x",
      }),
    ).rejects.toBeInstanceOf(ConflictError);

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(usersRepository.createUser).not.toHaveBeenCalled();
  });
});