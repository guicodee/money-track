import { SessionRepository } from "@src/repositories/implementations/session-repository";
import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { BcryptHash } from "@src/utils/bcrypt";
import { AutenticateService } from "../users/autenticate.service";
import { CreateUserService } from "../users/create-user.service";
import { DeleteMeService } from "../users/delete-user.service";
import { GetMeService } from "../users/get-me.service";
import { LogoutService } from "../users/logout-service.service";
import { RefreshTokenService } from "../users/refresh-token.service";

const users_repository = new UsersRepository();
const session_repository = new SessionRepository();
const bcrypt_hash = new BcryptHash();

export const MakeAutenticate = () => new AutenticateService(
  users_repository, 
  session_repository, 
  bcrypt_hash
);
export const MakeCreateUser = () => new CreateUserService(
  users_repository, 
  bcrypt_hash
);
export const MakeDeleteUser = () => new DeleteMeService(users_repository);
export const MakeGetMe = () => new GetMeService(users_repository);
export const MakeLogout = () => new LogoutService(session_repository);
export const MakeRefreshToken = () => new RefreshTokenService(session_repository);
