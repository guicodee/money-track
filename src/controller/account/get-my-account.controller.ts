import { MakeGetMyAccount } from "@src/services/factory/make-account";
import type { FastifyReply, FastifyRequest } from "fastify";

const getMyAccountService = MakeGetMyAccount();

export async function getMyAccountController(req: FastifyRequest, reply: FastifyReply) {
  const { account } = await getMyAccountService.execute(req.user.sub);

  return reply.status(200).send(account);
}