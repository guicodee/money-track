import { MakeCreateAccount } from "@src/services/factory/make-account";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createAccountSchema } from "./schema";

const createAccountService = MakeCreateAccount();

export async function createAccountController(req: FastifyRequest, reply: FastifyReply) {
  const body = createAccountSchema.parse(req.body);

  const { account } = await createAccountService.execute({ ...body, userId: req.user.sub });

  return reply.status(201).send(account);
}