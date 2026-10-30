import type { CategoryDto, UpdateCategoryDto } from "@src/dto/category-dto";
import { AppError, ConflictError, isUniqueViolation } from "@src/errors/error";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

export class UpdateCategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(data: UpdateCategoryDto): Promise<CategoryDto> {
    const { id, userId } = data;

    const current = await this.categoryRepository.findById(id, userId);
    if (!current) throw new AppError("Categoria não encontrada", 404);

    const description = data.description ?? current.description;
    const categoryType = data.categoryType ?? current.categoryType;

    const typeChanged = categoryType !== current.categoryType;
    const descriptionChanged = description !== current.description;

    if (!typeChanged && !descriptionChanged) return current;

    if (typeChanged && (await this.categoryRepository.hasTransactions(id, userId))) {
      throw new ConflictError(
        "Not is possible alter the type of a category vinculed the transactions",
      );
    }

    const duplicate = await this.categoryRepository.findDuplicate({
      userId,
      description,
      categoryType,
      excludeId: id,
    });
    if (duplicate) throw new ConflictError("You already have a category with this name and type");

    try {
      const updated = await this.categoryRepository.update(id, userId, {
        description,
        categoryType,
      });
      if (!updated) throw new AppError("Category not found", 404);
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("You already have a category with this name and type");
      }
      throw error;
    }
  }
}