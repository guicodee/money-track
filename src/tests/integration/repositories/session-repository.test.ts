import { SessionRepository } from "@src/repositories/implementations/session-repository";
import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "../../setup/db";

const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);

describe("SessionRepository (Postgres)", () => {
  const users = new UsersRepository();
  const sessions = new SessionRepository();
  let userId: number;

  beforeEach(async () => {
    await resetDatabase();
    userId = (await users.createUser({ name: "Ana", email: "ana@test.com", password: "h" })).id;
  });

  const newSession = (overrides: { refreshTokenHash?: string; expiresAt?: Date } = {}) =>
    sessions.create({
      userId,
      refreshTokenHash: overrides.refreshTokenHash ?? "hash-1",
      expiresAt: overrides.expiresAt ?? inMinutes(10),
    });

  it("encontra sessão ativa por id", async () => {
    const s = await newSession();
    expect((await sessions.findActiveById(s.id))?.id).toBe(s.id);
  });

  it("não considera ativa a sessão revogada", async () => {
    const s = await newSession();
    await sessions.revokeById(s.id);
    expect(await sessions.findActiveById(s.id)).toBeNull();
  });

  it("não considera ativa a sessão expirada", async () => {
    const s = await newSession({ expiresAt: inMinutes(-1) });
    expect(await sessions.findActiveById(s.id)).toBeNull();
  });

  it("busca por hash e ignora sessões revogadas", async () => {
    const s = await newSession({ refreshTokenHash: "abc" });
    expect((await sessions.findByRefreshTokenHash("abc"))?.id).toBe(s.id);

    await sessions.revokeById(s.id);
    expect(await sessions.findByRefreshTokenHash("abc")).toBeNull();
  });

  it("revokeAllByUserId revoga todas as sessões do usuário", async () => {
    const a = await newSession({ refreshTokenHash: "a" });
    const b = await newSession({ refreshTokenHash: "b" });

    await sessions.revokeAllByUserId(userId);

    expect(await sessions.findActiveById(a.id)).toBeNull();
    expect(await sessions.findActiveById(b.id)).toBeNull();
  });

  it("retorna null quando o ID não existe", async () => {
    expect(await sessions.findActiveById(999999)).toBeNull();
  });

  it("retorna null quando o hash não existe", async () => {
    expect(await sessions.findByRefreshTokenHash("non-existent-hash")).toBeNull();
  });

  it("cria uma sessão e retorna os dados persistidos", async () => {
    const data = {
      userId,
      refreshTokenHash: "unique-hash",
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
      expiresAt: inMinutes(30),
    };

    const session = await sessions.create(data);

    expect(session).toMatchObject(data);
    expect(session.id).toBeTypeOf("number");
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.revokedAt).toBeNull();
  });

  it("não permite criar sessões com hash duplicado", async () => {
    await newSession({ refreshTokenHash: "duplicate-hash" });

    await expect(
      newSession({ refreshTokenHash: "duplicate-hash" }),
    ).rejects.toThrow();
  });

  it("não permite criar sessão para usuário inexistente", async () => {
    await expect(
      sessions.create({
        userId: 999999,
        refreshTokenHash: "orphan-session",
        expiresAt: inMinutes(10),
      }),
    ).rejects.toThrow();
  });

  it("revoga a sessão informada", async () => {
    const session = await newSession();

    await sessions.revokeById(session.id);

    const result = await sessions.findActiveById(session.id);

    expect(result).toBeNull();
  });

  it("não revoga sessões pertencentes a outros usuários", async () => {
    const otherUser = await users.createUser({
      name: "Carlos",
      email: "carlos@test.com",
      password: "h",
    });

    const userSession = await newSession({
      refreshTokenHash: "ana-session",
    });

    const otherSession = await sessions.create({
      userId: otherUser.id,
      refreshTokenHash: "carlos-session",
      expiresAt: inMinutes(10),
    });

    await sessions.revokeAllByUserId(userId);

    expect(await sessions.findActiveById(userSession.id)).toBeNull();

    expect(
      (await sessions.findActiveById(otherSession.id))?.id,
    ).toBe(otherSession.id);
  });

  it("remove as sessões quando o usuário é excluído", async () => {
    const session = await newSession();

    await users.deleteById(userId);

    expect(await sessions.findActiveById(session.id)).toBeNull();
    expect(
      await sessions.findByRefreshTokenHash("hash-1"),
    ).toBeNull();
  });
});