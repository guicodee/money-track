import { MakeDeleteAccount } from "@src/services/factory/make-account";
import type { FastifyReply, FastifyRequest } from "fastify";

const deleteAccountService = MakeDeleteAccount();

export async function deleteAccountController(req: FastifyRequest, reply: FastifyReply) {
  await deleteAccountService.execute(req.user.sub);

  return reply.status(204).send();
}