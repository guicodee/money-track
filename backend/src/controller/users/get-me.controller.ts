import { AppError } from "@src/errors/error";
import { MakeGetMe } from "@src/services/factory/make-user";
import type { FastifyReply, FastifyRequest } from "fastify";

const getMeService = MakeGetMe();

export async function getMeController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { sub } = req.user;

    const user = await getMeService.execute(sub);

    return reply.status(200).send(user);

  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    throw error;
  }
}