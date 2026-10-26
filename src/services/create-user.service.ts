import type { createUserDto } from "@src/dto/user-dto";
import { ConflictError } from "@src/errors/error";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";
import type { BcryptHash } from "@src/utils/bcrypt";

export class CreateUserService {
	constructor(
		private usersRepository: IUserRepository,
		private bcrypt: BcryptHash
	) {}

	async execute({ email, password, name }: createUserDto) {
		const userExistsWithSameEmail = await this.usersRepository.findByEmail(email);

		if (userExistsWithSameEmail) {
			throw new ConflictError('This e-mail already exists');
		}

		const password_hash = await this.bcrypt.hash(password);

		const user = await this.usersRepository.createUser({
			email,
			name,
			password: password_hash,
		});

		return { user };
	}
}