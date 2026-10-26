import { UsersRepository } from "@src/repositories/implementations/users-repository";
import { BcryptHash } from "@src/utils/bcrypt";
import { CreateUserService } from "../create-user.service";

export function MakeCreateUser() {
	const users_repository = new UsersRepository();
	const bcrypt_hash = new BcryptHash();
	const create_user_service = new CreateUserService(users_repository, bcrypt_hash);

	return create_user_service;
}