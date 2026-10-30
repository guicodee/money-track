import type { CategoryDto, CreateCategoryDto } from "@src/dto/category-dto";
import { ConflictError, isUniqueViolation } from "@src/errors/error";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

export class CreateCategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute(data: CreateCategoryDto): Promise<CategoryDto> {
    const duplicate = await this.categoryRepository.findDuplicate({
      userId: data.userId,
      description: data.description,
      categoryType: data.categoryType,
    });
    if (duplicate) throw new ConflictError("You already have a category with this name and type");

    try {
      return await this.categoryRepository.create(data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("You already have a category with this name and type");
      }
      throw error;
    }
  }
}