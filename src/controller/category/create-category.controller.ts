import { MakeCreateCategoryService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const bodySchema = z.object({
  description: z.string().trim().min(1).max(100),
  categoryType: z.enum(["EXPENSE", "INCOME"]),
});

export async function createCategoryController(req: FastifyRequest, reply: FastifyReply) {
  const { description, categoryType } = bodySchema.parse(req.body);

  const category = await MakeCreateCategoryService().execute({
    userId: req.user.sub,
    description,
    categoryType,
  });

  return reply.status(201).send(category);
}