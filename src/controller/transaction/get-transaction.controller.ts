import { MakeGetTransactionService } from "@src/services/factory/make-transaction";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export async function getTransactionController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(req.params);

  const transaction = await MakeGetTransactionService().execute({ id, userId: req.user.sub });

  return reply.status(200).send(transaction);
}