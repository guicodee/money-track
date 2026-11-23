import type { CategoryDto, FindCategoryDto } from "@src/dto/category-dto";
import { AppError } from "@src/errors/error";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

export class GetCategoryService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute({ id, userId }: FindCategoryDto): Promise<CategoryDto> {
    const category = await this.categoryRepository.findById(id, userId);
    if (!category) throw new AppError("Category not found", 404);
    return category;
  }
}