import { AppError } from "@src/errors/error";
import type { ISessionRepository } from "@src/repositories/interfaces/session-repository-interface";
import { fastify } from "@src/server";
import type { BcryptHash } from "@src/utils/bcrypt";
import { generateAccessToken, generateRefreshToken } from "@src/utils/token";


export class RefreshTokenService {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute(refreshToken: string | undefined) {
    if(!refreshToken) {
      throw new AppError('Refresh token not found', 401);
    }

    let payload: { sub: number; email: string };

    try {
      payload = fastify.jwt.verify(refreshToken) as { sub: number; email: string };
    } catch {
      throw new AppError("Refresh token inválido ou expirado", 401);
    }

    const session = await this.sessionRepository.findByRefreshTokenHash(refreshToken);

    if (!session) {
      throw new AppError("Session invalid or expired", 401);
    }

    await this.sessionRepository.revokeById(session.id);
    
    const newRefreshToken = generateRefreshToken({ sub: payload.sub, email: payload.email });

    const newSession = await this.sessionRepository.create({
      userId: payload.sub,
      refreshTokenHash: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const newAccessToken = generateAccessToken({ sub: payload.sub, email: payload.email, sid: newSession.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }
}