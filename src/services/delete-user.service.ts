import { AppError } from "@src/errors/error";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";

export class DeleteMeService {
  constructor(private usersRepository: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await this.usersRepository.deleteById(userId);
  }
}