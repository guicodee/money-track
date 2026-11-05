import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { dateOnlySchema, operationTypeSchema } from "./transaction-fields";
import { MakeListTransactionsService } from "@src/services/factory/make-transaction";

const querySchema = z
  .object({
    type: operationTypeSchema.optional(),
    accountId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    period: z.enum(["7d", "30d", "365d"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine((q) => !(q.period && (q.startDate || q.endDate)), {
    message: "period cannot be combined with startDate/endDate",
  })
  .refine((q) => !(q.startDate && q.endDate) || q.startDate <= q.endDate, {
    message: "startDate cannot be greater than endDate",
  });

export async function listTransactionsController(req: FastifyRequest, reply: FastifyReply) {
  const query = querySchema.parse(req.query);

  const result = await MakeListTransactionsService().execute({
    userId: req.user.sub,
    ...query,
  });

  return reply.status(200).send(result);
}