import { fastify } from "@src/server";
import { createHash, randomUUID } from "crypto";

export interface AccessTokenPayload {
  sub: number;
  email: string;
  sid: number; // id da sessão
}

export interface RefreshTokenPayload {
  sub: number;
  email: string;
}

export function generateAccessToken(payload: AccessTokenPayload): string {
  return fastify.jwt.sign(payload); 
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return fastify.jwt.sign(payload, { expiresIn: '7d', jti: randomUUID() });
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}