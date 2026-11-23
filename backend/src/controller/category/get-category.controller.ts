import { MakeGetCategoryService } from "@src/services/factory/make-category";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { idSchema } from "../shared/fieds";

const paramsSchema = z.object({
  id: idSchema
});

export async function getCategoryController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(req.params);

  const category = await MakeGetCategoryService().execute({
    id,
    userId: req.user.sub,
  });

  return reply.status(200).send(category);
}