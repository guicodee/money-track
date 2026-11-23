import type { CreateSessionDto, SessionDto } from "@src/dto/session-dto";

export interface ISessionRepository {
  create(data: CreateSessionDto): Promise<SessionDto>;
  findByRefreshTokenHash(hash: string): Promise<SessionDto | null>;
  findActiveById(id: number): Promise<SessionDto | null>;
  revokeById(id: number): Promise<void>;
  revokeAllByUserId(userId: number): Promise<void>; 
}