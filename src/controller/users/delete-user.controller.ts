import type { FastifyRequest, FastifyReply } from "fastify";
import { MakeDeleteUser } from "@src/services/factory/make-delete-user";
import { AppError } from "@src/errors/error";

const deleteUserService = MakeDeleteUser();

export async function deleteUserController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { sub } = req.user;

    await deleteUserService.execute(sub);

    reply.clearCookie("refreshToken", { path: "/auth" });

    return reply.status(204).send();

  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    throw error;
  }
}