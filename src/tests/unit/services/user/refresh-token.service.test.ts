import { RefreshTokenService } from "@src/services/users/refresh-token.service";
import { hashToken } from "@src/utils/token";
import { beforeEach, describe, expect, it, vi } from "vitest";

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

describe("RefreshTokenService", () => {
  const sessionRepository = {
    findByRefreshTokenHash: vi.fn(),
    revokeById: vi.fn(),
    create: vi.fn(),
  };
  const tokens = {
    verifyRefreshToken: vi.fn(),
    generateRefreshToken: vi.fn(() => "new-refresh"),
    generateAccessToken: vi.fn(() => "new-access"),
  };
  const sut = new RefreshTokenService(sessionRepository as any, tokens as any);

  const validSession = { id: 5, userId: 10, userAgent: null, ipAddress: null, expiresAt: future() };

  beforeEach(() => {
    tokens.verifyRefreshToken.mockReturnValue({ sub: 10, email: "a@test.com" });
    sessionRepository.create.mockResolvedValue({ id: 6 });
  });

  it("rejeita quando não há refresh token", async () => {
    await expect(sut.execute(undefined)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejeita JWT inválido sem consultar o banco", async () => {
    tokens.verifyRefreshToken.mockImplementation(() => {
      throw new Error("invalid");
    });

    await expect(sut.execute("lixo")).rejects.toMatchObject({ statusCode: 401 });
    expect(sessionRepository.findByRefreshTokenHash).not.toHaveBeenCalled();
  });

  it("busca a sessão pelo hash do token, nunca pelo token cru", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(validSession);

    await sut.execute("old-refresh");

    expect(sessionRepository.findByRefreshTokenHash).toHaveBeenCalledWith(hashToken("old-refresh"));
  });

  it("rejeita sessão inexistente ou revogada", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(null);

    await expect(sut.execute("old-refresh")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rejeita sessão de outro usuário", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue({ ...validSession, userId: 99 });

    await expect(sut.execute("old-refresh")).rejects.toMatchObject({ statusCode: 401 });
    expect(sessionRepository.revokeById).not.toHaveBeenCalled();
  });

  it("rejeita sessão expirada sem revogar nem criar outra", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue({ ...validSession, expiresAt: past() });

    await expect(sut.execute("old-refresh")).rejects.toMatchObject({ statusCode: 401 });
    expect(sessionRepository.revokeById).not.toHaveBeenCalled();
    expect(sessionRepository.create).not.toHaveBeenCalled();
  });

  it("rotaciona: revoga a antiga, grava só o hash da nova e liga o access token a ela", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(validSession);

    const result = await sut.execute("old-refresh");

    expect(sessionRepository.revokeById).toHaveBeenCalledWith(5);
    expect(sessionRepository.create.mock.calls[0][0].refreshTokenHash).toBe(hashToken("new-refresh"));
    expect(tokens.generateAccessToken).toHaveBeenCalledWith({ sub: 10, email: "a@test.com", sid: 6 });
    expect(result).toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
  });

  it("não gera novos tokens quando a sessão não existe", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(null);

    await expect(sut.execute("old-refresh")).rejects.toMatchObject({
      statusCode: 401,
    });

    expect(sessionRepository.revokeById).not.toHaveBeenCalled();
    expect(sessionRepository.create).not.toHaveBeenCalled();
    expect(tokens.generateRefreshToken).not.toHaveBeenCalled();
    expect(tokens.generateAccessToken).not.toHaveBeenCalled();
  });

  it("preserva userAgent e ipAddress na nova sessão", async () => {
    const session = {
      ...validSession,
      userAgent: "Mozilla/5.0",
      ipAddress: "192.168.0.1",
    };

    sessionRepository.findByRefreshTokenHash.mockResolvedValue(session);

    await sut.execute("old-refresh");

    expect(sessionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.0.1",
      }),
    );
  });

  it("gera novo refresh token utilizando os dados do usuário", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(validSession);

    await sut.execute("old-refresh");

    expect(tokens.generateRefreshToken).toHaveBeenCalledWith({
      sub: 10,
      email: "a@test.com",
    });
  });

  it("não gera access token quando a nova sessão não pode ser criada", async () => {
    sessionRepository.findByRefreshTokenHash.mockResolvedValue(validSession);
    sessionRepository.create.mockRejectedValue(new Error("Database error"));

    await expect(sut.execute("old-refresh")).rejects.toThrow("Database error");

    expect(tokens.generateAccessToken).not.toHaveBeenCalled();
  });
});