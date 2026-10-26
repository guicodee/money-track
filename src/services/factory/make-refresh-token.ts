import { SessionRepository } from "@src/repositories/implementations/session-repository";
import { RefreshTokenService } from "../refresh-token.service";

export function MakeRefreshToken() {
  const session_repository = new SessionRepository();

  return new RefreshTokenService(session_repository);
}