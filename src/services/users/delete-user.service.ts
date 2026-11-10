import { AppError, ConflictError, isForeignKeyViolation } from "@src/errors/error";
import type { IUserRepository } from "@src/repositories/interfaces/user-repository-interface";

export class DeleteMeService {
  constructor(private usersRepository: IUserRepository) {}

  async execute(userId: number) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    try {
      await this.usersRepository.deleteById(userId);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictError("Delete your account and categories before deleting your user");
      }
      throw error;
    }
  }
}