import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { startOfDaySaoPaulo } from "@src/utils/date";
import { amountSchema, dateOnlySchema, operationTypeSchema } from "./transaction-fields";
import { MakeCreateTransactionService } from "@src/services/factory/make-transaction";

const bodySchema = z.object({
  description: z.string().trim().min(1).max(255),
  amount: amountSchema,
  operationType: operationTypeSchema,
  occurredAt: dateOnlySchema,
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
});

export async function createTransactionController(req: FastifyRequest, reply: FastifyReply) {
  const body = bodySchema.parse(req.body);

  const transaction = await MakeCreateTransactionService().execute({
    userId: req.user.sub,
    description: body.description,
    amount: body.amount,
    operationType: body.operationType,
    occurredAt: startOfDaySaoPaulo(body.occurredAt),
    accountId: body.accountId,
    categoryId: body.categoryId ?? null,
  });

  return reply.status(201).send(transaction);
}