import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { GetMeService } from "../get-me.service";

export function MakeGetMe() {
  const users_repository = new UsersRepository();
  return new GetMeService(users_repository);
}