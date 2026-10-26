import { db } from "@src/db";
import { sessionsTable } from "@src/db/schema/sessions";
import { eq, and, isNull, gt } from "drizzle-orm";
import type { ISessionRepository } from "../interfaces/session-repository-interface";
import type { CreateSessionDto, SessionDto } from "@src/dto/session-dto";

export class SessionRepository implements ISessionRepository {
  async findActiveById(id: number): Promise<SessionDto | null> {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.id, id),
          isNull(sessionsTable.revokedAt),
          gt(sessionsTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return session ?? null;
  }


  async create(data: CreateSessionDto): Promise<SessionDto> {
    const [session] = await db
      .insert(sessionsTable)
      .values(data)
      .returning();

    return session;
  }

  async findByRefreshTokenHash(hash: string): Promise<SessionDto | null> {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(
        and(
          eq(sessionsTable.refreshTokenHash, hash),
          isNull(sessionsTable.revokedAt), 
        )
      )
      .limit(1);

    return session ?? null;
  }

  async revokeById(id: number): Promise<void> {
    await db
    .update(sessionsTable)
    .set({ revokedAt: new Date() })
    .where(eq(sessionsTable.id, id))
    .returning({ id: sessionsTable.id, revokedAt: sessionsTable.revokedAt });
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    await db
      .update(sessionsTable)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessionsTable.userId, userId),
          isNull(sessionsTable.revokedAt),
        )
      );
  }
}