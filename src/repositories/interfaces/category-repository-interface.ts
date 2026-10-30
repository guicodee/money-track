import type {
  CategoryDto,
  CreateCategoryDto,
  FindDuplicateCategoryDto,
  ListCategoriesRepositoryDto,
  ListCategoriesResultDto,
  UpdateCategoryDataDto,
} from "@src/dto/category-dto";

export interface ICategoryRepository {
  create(data: CreateCategoryDto): Promise<CategoryDto>;
  findById(id: number, userId: number): Promise<CategoryDto | null>;
  findDuplicate(params: FindDuplicateCategoryDto): Promise<CategoryDto | null>;
  list(params: ListCategoriesRepositoryDto): Promise<ListCategoriesResultDto>;
  update(id: number, userId: number, data: UpdateCategoryDataDto): Promise<CategoryDto | null>;
  delete(id: number, userId: number): Promise<boolean>;
  hasTransactions(id: number, userId: number): Promise<boolean>;
}