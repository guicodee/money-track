import { AppError } from "@src/errors/error";
import type { ISessionRepository } from "@src/repositories/interfaces/session-repository-interface";
import { hashToken, refreshTokenExpiresAt, type TokenService } from "@src/utils/token";

export class RefreshTokenService {
  constructor(
    private sessionRepository: ISessionRepository,
    private tokens: TokenService,
  ) {}

  async execute(refreshToken: string | undefined) {
    if (!refreshToken) throw new AppError("Refresh token not found", 401);

    let payload: { sub: number; email: string };
    try {
      payload = this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Refresh token inválido ou expirado", 401);
    }

    const session = await this.sessionRepository.findByRefreshTokenHash(hashToken(refreshToken));

    if (!session || session.userId !== payload.sub || session.expiresAt <= new Date()) {
      throw new AppError("Session invalid or expired", 401);
    }

    await this.sessionRepository.revokeById(session.id);

    const newRefreshToken = this.tokens.generateRefreshToken({
      sub: payload.sub,
      email: payload.email,
    });

    const newSession = await this.sessionRepository.create({
      userId: payload.sub,
      refreshTokenHash: hashToken(newRefreshToken),
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      expiresAt: refreshTokenExpiresAt(),
    });

    const accessToken = this.tokens.generateAccessToken({
      sub: payload.sub,
      email: payload.email,
      sid: newSession.id,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }
}