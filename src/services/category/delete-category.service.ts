import type { FindCategoryDto } from "@src/dto/category-dto";
import { AppError, ConflictError } from "@src/errors/error";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

function isForeignKeyViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23503" || e?.cause?.code === "23503";
}

export class DeleteCategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute({ id, userId }: FindCategoryDto): Promise<void> {
    const category = await this.categoryRepository.findById(id, userId);
    if (!category) throw new AppError("Category not found", 404);

    if (await this.categoryRepository.hasTransactions(id, userId)) {
      throw new ConflictError("Not is possible exclude the type of a category vinculed the transactions");
    }

    try {
      const deleted = await this.categoryRepository.delete(id, userId);
      if (!deleted) throw new AppError("Category not found", 404);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictError("Category vinculed with transactions");
      }
      throw error;
    }
  }
}