import { MakeListCategoriesService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function listCategoriesController(req: FastifyRequest, reply: FastifyReply) {
  const { type, page } = querySchema.parse(req.query);

  const result = await MakeListCategoriesService().execute({
    userId: req.user.sub,
    type,
    page,
  });

  return reply.status(200).send(result);
}