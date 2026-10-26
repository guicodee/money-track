import { AppError } from "@src/errors/error";
import { MakeLogout } from "@src/services/factory/make-logout";
import type { FastifyRequest, FastifyReply } from "fastify";

const logoutService = MakeLogout();

export async function logoutController(req: FastifyRequest, reply: FastifyReply) {
  try {

    await logoutService.execute(req.user.sid);

    reply.clearCookie("refreshToken", { path: "/auth" });

    return reply.status(200).send({ message: "Logout successful" });

  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    return reply.status(500).send({ error: "Internal server error" });
  }
}