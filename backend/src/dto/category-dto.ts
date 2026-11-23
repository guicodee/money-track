export type CategoryType = "EXPENSE" | "INCOME";

export interface CategoryDto {
  id: number;
  userId: number;
  description: string;
  categoryType: CategoryType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  userId: number;
  description: string;
  categoryType: CategoryType;
}

export interface FindCategoryDto {
  id: number;
  userId: number;
}

export interface UpdateCategoryDto extends FindCategoryDto {
  description?: string;
  categoryType?: CategoryType;
}

export interface UpdateCategoryDataDto {
  description?: string;
  categoryType?: CategoryType;
}

export interface FindDuplicateCategoryDto {
  userId: number;
  description: string;
  categoryType: CategoryType;
  excludeId?: number;
}

export interface ListCategoriesDto {
  userId: number;
  type?: CategoryType;
  page: number;
}

export interface ListCategoriesRepositoryDto {
  userId: number;
  type?: CategoryType;
  limit: number;
  offset: number;
}

export interface ListCategoriesResultDto {
  items: CategoryDto[];
  total: number;
}

export interface PaginatedCategoriesDto {
  data: CategoryDto[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}