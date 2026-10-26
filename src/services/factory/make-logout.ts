import { SessionRepository } from "@src/repositories/implementations/session-repository";
import { LogoutService } from "../logout-service.service";

export function MakeLogout() {
  const session_repository = new SessionRepository();

  return new LogoutService(session_repository);
}