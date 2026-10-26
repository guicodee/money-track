import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { BcryptHash } from "@src/utils/bcrypt";
import { AutenticateService } from "../autenticate.service";
import { SessionRepository } from "@src/repositories/implementations/session-repository";

export function MakeAutenticate() {
  const users_repository = new UsersRepository();
  const session_repository = new SessionRepository();
  const bcrypt_hash = new BcryptHash();
  const autenticate_service = new AutenticateService(users_repository, session_repository, bcrypt_hash);

  return autenticate_service;
}