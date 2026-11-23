import { MakeUpdateTransactionService } from "@src/services/factory/make-transaction";
import { startOfDaySaoPaulo } from "@src/utils/date";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { bodyIdSchema, idSchema } from "../shared/fieds";
import { amountSchema, dateOnlySchema, operationTypeSchema } from "./transaction-fields";

const paramsSchema = z.object({
  id: idSchema
});

const bodySchema = z
  .object({
    description: z.string().trim().min(1).max(255).optional(),
    amount: amountSchema.optional(),
    operationType: operationTypeSchema.optional(),
    occurredAt: dateOnlySchema.optional(),
    accountId: bodyIdSchema.optional(),
    categoryId: bodyIdSchema.nullable().optional()
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Report at least one field to update",
  });

export async function updateTransactionController(req: FastifyRequest, reply: FastifyReply) {
  const { id } = paramsSchema.parse(req.params);
  const body = bodySchema.parse(req.body);

  const transaction = await MakeUpdateTransactionService().execute({
    id,
    userId: req.user.sub,
    description: body.description,
    amount: body.amount,
    operationType: body.operationType,
    occurredAt: body.occurredAt ? startOfDaySaoPaulo(body.occurredAt) : undefined,
    accountId: body.accountId,
    categoryId: body.categoryId,
  });

  return reply.status(200).send(transaction);
}