import { MakeCreateTransactionService } from "@src/services/factory/make-transaction";
import { startOfDaySaoPaulo } from "@src/utils/date";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { bodyIdSchema } from "../shared/fieds";
import { amountSchema, dateOnlySchema, operationTypeSchema } from "./transaction-fields";

const bodySchema = z.object({
  description: z.string().trim().min(1).max(255),
  amount: amountSchema,
  operationType: operationTypeSchema,
  occurredAt: dateOnlySchema,
  accountId: bodyIdSchema,
  categoryId: bodyIdSchema.nullable().optional()
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