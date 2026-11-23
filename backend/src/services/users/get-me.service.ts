import { AppError } from "@src/errors/error";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";

export class GetMeService {
  constructor(private usersRepository: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}