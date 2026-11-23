import { MakeListCategoriesService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { pageSchema } from "../shared/fieds";

const querySchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]).optional(),
  page: pageSchema
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