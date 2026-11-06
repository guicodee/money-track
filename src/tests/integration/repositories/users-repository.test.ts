import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../setup/db";

describe("UsersRepository (Postgres)", () => {
  const repo = new UsersRepository();

  beforeEach(resetDatabase);

  it("cria e busca usuário por e-mail e por id", async () => {
    const created = await repo.createUser({ name: "Ana", email: "ana@test.com", password: "hash" });

    expect((await repo.findByEmail("ana@test.com"))?.id).toBe(created.id);
    expect((await repo.findById(created.id))?.email).toBe("ana@test.com");
  });

  it("retorna null para e-mail e id inexistentes", async () => {
    expect(await repo.findByEmail("nao@existe.com")).toBeNull();
    expect(await repo.findById(999999)).toBeNull();
  });

  it("exclui o usuário", async () => {
    const created = await repo.createUser({ name: "Ana", email: "ana@test.com", password: "hash" });

    await repo.deleteById(created.id);

    expect(await repo.findById(created.id)).toBeNull();
  });

  it("persiste corretamente os dados do usuário", async () => {
    const data = {
      name: "Ana",
      email: "ana@test.com",
      password: "password-hash",
    };

    const created = await repo.createUser(data);

    expect(created).toMatchObject(data);
    expect(created.id).toBeTypeOf("number");
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);
  });

  it("não permite criar usuários com e-mail duplicado", async () => {
    await repo.createUser({
      name: "Ana",
      email: "ana@test.com",
      password: "hash",
    });

    await expect(
      repo.createUser({
        name: "Maria",
        email: "ana@test.com",
        password: "another-hash",
      }),
    ).rejects.toThrow();
  });

  it("não gera erro ao excluir um usuário inexistente", async () => {
    await expect(repo.deleteById(999999)).resolves.toBeUndefined();
  });

  it("exclui somente o usuário informado", async () => {
    const ana = await repo.createUser({
      name: "Ana",
      email: "ana@test.com",
      password: "hash",
    });

    const maria = await repo.createUser({
      name: "Maria",
      email: "maria@test.com",
      password: "hash",
    });

    await repo.deleteById(ana.id);

    expect(await repo.findById(ana.id)).toBeNull();
    expect(await repo.findById(maria.id)).not.toBeNull();
  });
});