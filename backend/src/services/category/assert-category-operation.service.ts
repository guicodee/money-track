import type { CategoryDto } from "@src/dto/category-dto";
import { AppError } from "@src/errors/error";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

export interface AssertCategoryOperationDto {
  categoryId: number;
  userId: number;
  operationType: "EXPENSE" | "INCOME" | "TRANSFER";
}

export class AssertCategoryOperationService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute({ categoryId, userId, operationType }: AssertCategoryOperationDto): Promise<CategoryDto> {
    if (operationType === "TRANSFER") {
      throw new AppError("Transferers cannot have a category", 400);
    }

    const category = await this.categoryRepository.findById(categoryId, userId);
    if (!category) throw new AppError("Category not found", 404);

    if (category.categoryType !== operationType) {
      throw new AppError(
        `Category of type ${category.categoryType} cannot have be used in transaction of type ${operationType}`,
        400,
      );
    }

    return category;
  }
}