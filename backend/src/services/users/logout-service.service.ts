import type { ISessionRepository } from "@src/repositories/interfaces/session-repository-interface";

export class LogoutService {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute(sessionId: number) {
    await this.sessionRepository.revokeById(sessionId);
  }
}