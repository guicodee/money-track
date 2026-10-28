import { AppError } from "@src/errors/error";
import { MakeRefreshToken } from "@src/services/factory/make-user";
import type { FastifyReply, FastifyRequest } from "fastify";

const refreshTokenService = MakeRefreshToken();

export async function refreshTokenController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const { accessToken, refreshToken: newRefreshToken } =
      await refreshTokenService.execute(refreshToken);

    reply.setCookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/auth",
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.status(200).send({ accessToken });

  } catch (error) {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    throw error;
  }
}