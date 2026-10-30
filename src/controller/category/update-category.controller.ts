import { MakeUpdateCategoryService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z
  .object({
    description: z.string().trim().min(1).max(100).optional(),
    categoryType: z.enum(["EXPENSE", "INCOME"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Informe ao menos um campo para atualizar",
  });

export async function updateCategoryController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(req.params);
  const { description, categoryType } = bodySchema.parse(req.body);

  const category = await MakeUpdateCategoryService().execute({
    id,
    userId: req.user.sub,
    description,
    categoryType,
  });

  return reply.status(200).send(category);
}