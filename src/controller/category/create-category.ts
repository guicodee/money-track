import { categoryParamsSchema, createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from "@src/dto/category-dto";
import { MakeCategoryService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";

const categoryService = MakeCategoryService();

export async function createCategory(req: FastifyRequest, reply: FastifyReply) {
  const body = createCategorySchema.parse(req.body);
  const category = await categoryService.create(req.user.sub, body);
  return reply.status(201).send(category);
}

export async function listCategories(req: FastifyRequest, reply: FastifyReply) {
  const query = listCategoriesQuerySchema.parse(req.query);
  const result = await categoryService.list(req.user.sub, query);
  return reply.status(200).send(result);
}

export async function getCategory(req: FastifyRequest, reply: FastifyReply) {
  const { id } = categoryParamsSchema.parse(req.params);
  const category = await categoryService.getById(id, req.user.sub);
  return reply.status(200).send(category);
}

export async function updateCategory(req: FastifyRequest, reply: FastifyReply) {
  const { id } = categoryParamsSchema.parse(req.params);
  const body = updateCategorySchema.parse(req.body);
  const category = await categoryService.update(id, req.user.sub, body);
  return reply.status(200).send(category);
}

export async function deleteCategory(req: FastifyRequest, reply: FastifyReply) {
  const { id } = categoryParamsSchema.parse(req.params);
  await categoryService.delete(id, req.user.sub);
  return reply.status(204).send();
}