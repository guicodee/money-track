import { AutenticateService } from "@src/services/users/autenticate.service";
import { hashToken } from "@src/utils/token";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeUser } from "../../../factories/user.factory";

describe("AutenticateService", () => {
  const user = makeUser({ id: 10, email: "ana@test.com" });
  const usersRepository = { findByEmail: vi.fn() };
  const sessionRepository = { create: vi.fn() };
  const bcrypt = { compare: vi.fn() };
  const tokens = {
    generateRefreshToken: vi.fn(() => "refresh-jwt"),
    generateAccessToken: vi.fn(() => "access-jwt"),
  };

  const sut = new AutenticateService(
    usersRepository as any,
    sessionRepository as any,
    bcrypt as any,
    tokens as any,
  );

  beforeEach(() => {
    sessionRepository.create.mockResolvedValue({ id: 77 });
  });

  it("rejeita e-mail inexistente com 401, sem comparar senha", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(sut.execute({ email: "x@test.com", password: "p" })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it("rejeita senha incorreta com 401 e não cria sessão", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(false);

    await expect(sut.execute({ email: user.email, password: "errada" })).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it("cria exatamente uma sessão, gravando o hash SHA-256 do refresh token", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await sut.execute({ email: user.email, password: "ok", userAgent: "ua", ipAddress: "1.1.1.1" });

    expect(sessionRepository.create).toHaveBeenCalledTimes(1);
    const saved = sessionRepository.create.mock.calls[0][0];
    expect(saved.refreshTokenHash).toBe(hashToken("refresh-jwt"));
    expect(saved.refreshTokenHash).not.toBe("refresh-jwt");
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("vincula o access token à sessão criada (sid) e não retorna a senha", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const result = await sut.execute({ email: user.email, password: "ok" });

    expect(tokens.generateAccessToken).toHaveBeenCalledWith({
      sub: 10,
      email: user.email,
      sid: 77,
    });
    expect(result.user).toEqual({ id: 10, name: user.name, email: user.email });
  });

  it("propaga erro quando o repository falha ao buscar usuário", async () => {
    usersRepository.findByEmail.mockRejectedValue(new Error("Database error"));

    await expect(
      sut.execute({ email: "ana@test.com", password: "123456" }),
    ).rejects.toThrow("Database error");

    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it("propaga erro quando bcrypt falha", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockRejectedValue(new Error("Bcrypt error"));

    await expect(
      sut.execute({ email: user.email, password: "123456" }),
    ).rejects.toThrow("Bcrypt error");

    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it("não gera access token quando a criação da sessão falha", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);
    sessionRepository.create.mockRejectedValue(new Error("Session error"));

    await expect(
      sut.execute({ email: user.email, password: "123456" }),
    ).rejects.toThrow("Session error");

    expect(tokens.generateAccessToken).not.toHaveBeenCalled();
  });

  it("armazena userAgent e ipAddress na sessão", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await sut.execute({
      email: user.email,
      password: "123456",
      userAgent: "Mozilla/5.0",
      ipAddress: "192.168.0.1",
    });

    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.0.1",
      }),
    );
  });

  it("gera refresh token com os dados do usuário autenticado", async () => {
    usersRepository.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    await sut.execute({ email: user.email, password: "123456" });

    expect(tokens.generateRefreshToken).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });
  });
});