import { compare, hash } from 'bcryptjs';

export class BcryptHash {
	async hash(password: string) {
		const SALT_ROUNDS = 8;
		const password_hash = await hash(password, SALT_ROUNDS);

		return password_hash;
	}

	async compare(password: string, user_password: string) {
		const doesPasswordMatches = await compare(password, user_password);

		return doesPasswordMatches;
	}
}