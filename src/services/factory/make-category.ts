import { CategoryRepository } from "@src/repositories/implementations/category-repository";
import { CreateCategoryService } from "../category/create-category.service";
import { DeleteCategoryService } from "../category/delete-category.service";
import { GetCategoryService } from "../category/get-category.service";
import { ListCategoriesService } from "../category/list-categories.sevice";
import { UpdateCategoryService } from "../category/update-category.service";

const categoryRepository = new CategoryRepository()

export const MakeCreateCategoryService = () => new CreateCategoryService(categoryRepository)
export const MakeListCategoriesService = () => new ListCategoriesService(categoryRepository)
export const MakeGetCategoryService = () => new GetCategoryService(categoryRepository)
export const MakeUpdateCategoryService = () => new UpdateCategoryService(categoryRepository)
export const MakeDeleteCategoryService = () => new DeleteCategoryService(categoryRepository)
