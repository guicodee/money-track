// src/controllers/category/category-routes.ts
import { authenticate } from "@src/middlewares/authenticate"; // ajuste o caminho
import type { FastifyInstance } from "fastify";
import { createCategoryController } from "./create-category.controller";
import { deleteCategoryController } from "./delete-category.controller";
import { getCategoryController } from "./get-category.controller";
import { listCategoriesController } from "./list-categories.controller";
import { updateCategoryController } from "./update-category.controller";

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/categories", listCategoriesController);
  app.get("/categories/:id", getCategoryController);
  app.post("/categories", createCategoryController);
  app.patch("/categories/:id", updateCategoryController);
  app.delete("/categories/:id", deleteCategoryController);
}