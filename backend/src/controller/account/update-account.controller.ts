import { MakeUpdateAccount } from "@src/services/factory/make-account";
import type { FastifyReply, FastifyRequest } from "fastify";
import { updateAccountSchema } from "./schema";

const updateAccountService = MakeUpdateAccount();

export async function updateAccountController(req: FastifyRequest, reply: FastifyReply) {
  const body = updateAccountSchema.parse(req.body);

  const { account } = await updateAccountService.execute(req.user.sub, body);

  return reply.status(200).send(account);
}