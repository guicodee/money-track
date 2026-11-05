import type { JWT } from "@fastify/jwt";
import { createHash, randomUUID } from "node:crypto";

export interface AccessTokenPayload { sub: number; email: string; sid: number }
export interface RefreshTokenPayload { sub: number; email: string }

const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiresAt(now = Date.now()): Date {
  return new Date(now + REFRESH_TOKEN_TTL_MS);
}

export class TokenService {
  constructor(private readonly jwt: JWT) {}

  generateAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload);
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return this.jwt.sign(payload, { expiresIn: REFRESH_TOKEN_EXPIRES_IN, jti: randomUUID() });
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.jwt.verify<RefreshTokenPayload>(token);
  }
}