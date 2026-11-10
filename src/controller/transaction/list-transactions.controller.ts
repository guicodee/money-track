import { MakeListTransactionsService } from "@src/services/factory/make-transaction";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { idSchema, pageSchema } from "../shared/fieds";
import { dateOnlySchema, operationTypeSchema } from "./transaction-fields";

const querySchema = z
  .object({
    type: operationTypeSchema.optional(),
    accountId: idSchema.optional(),
    categoryId: idSchema.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
    period: z.enum(["7d", "30d", "365d"]).optional(),
    page: pageSchema
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