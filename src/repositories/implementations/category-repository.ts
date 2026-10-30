import { db } from "@src/db";
import { categoryTable } from "@src/db/schema/category";
import { transactionsTable } from "@src/db/schema/transactions";
import type {
  CategoryDto,
  CreateCategoryDto,
  FindDuplicateCategoryDto,
  ListCategoriesRepositoryDto,
  ListCategoriesResultDto,
  UpdateCategoryDataDto,
} from "@src/dto/category-dto";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import type { ICategoryRepository } from "../interfaces/category-repository-interface";

export class CategoryRepository implements ICategoryRepository {
  async create(data: CreateCategoryDto): Promise<CategoryDto> {
    const [category] = await db.insert(categoryTable).values(data).returning();
    return category;
  }

  async findById(id: number, userId: number): Promise<CategoryDto | null> {
    const [category] = await db
      .select()
      .from(categoryTable)
      .where(and(eq(categoryTable.id, id), eq(categoryTable.userId, userId)))
      .limit(1);
    return category ?? null;
  }

  async findDuplicate(params: FindDuplicateCategoryDto): Promise<CategoryDto | null> {
    const { userId, description, categoryType, excludeId } = params;
    const [category] = await db
      .select()
      .from(categoryTable)
      .where(
        and(
          eq(categoryTable.userId, userId),
          eq(categoryTable.categoryType, categoryType),
          sql`lower(${categoryTable.description}) = lower(${description})`,
          excludeId ? ne(categoryTable.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    return category ?? null;
  }

  async list(params: ListCategoriesRepositoryDto): Promise<ListCategoriesResultDto> {
    const { userId, type, limit, offset } = params;
    const where = and(
      eq(categoryTable.userId, userId),
      type ? eq(categoryTable.categoryType, type) : undefined,
    );

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(categoryTable)
        .where(where)
        .orderBy(asc(categoryTable.description), asc(categoryTable.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(categoryTable).where(where),
    ]);

    return { items, total };
  }

  async update(
    id: number,
    userId: number,
    data: UpdateCategoryDataDto,
  ): Promise<CategoryDto | null> {
    const [category] = await db
      .update(categoryTable)
      .set(data)
      .where(and(eq(categoryTable.id, id), eq(categoryTable.userId, userId)))
      .returning();
    return category ?? null;
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const deleted = await db
      .delete(categoryTable)
      .where(and(eq(categoryTable.id, id), eq(categoryTable.userId, userId)))
      .returning({ id: categoryTable.id });
    return deleted.length > 0;
  }

  async hasTransactions(id: number, userId: number): Promise<boolean> {
    const [row] = await db
      .select({ id: transactionsTable.id })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.categoryId, id),
          eq(transactionsTable.userId, userId),
        ),
      )
      .limit(1);
    return !!row;
  }
}