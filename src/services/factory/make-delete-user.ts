import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { DeleteMeService } from "../delete-user.service";

export function MakeDeleteUser() {
  const users_repository = new UsersRepository();
  return new DeleteMeService(users_repository);
}