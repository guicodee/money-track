import type { ListCategoriesDto, PaginatedCategoriesDto } from "@src/dto/category-dto";
import type { ICategoryRepository } from "@src/repositories/interfaces/category-repository-interface";

const PAGE_SIZE = 10;

export class ListCategoriesService {
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async execute({ userId, type, page }: ListCategoriesDto): Promise<PaginatedCategoriesDto> {
    const { items, total } = await this.categoryRepository.list({
      userId,
      type,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    return {
      data: items,
      page,
      limit: PAGE_SIZE,
      total,
      totalPages: Math.ceil(total / PAGE_SIZE),
    };
  }
}