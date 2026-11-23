import type { FastifyRequest, FastifyReply } from "fastify";
import { SessionRepository } from "@src/repositories/implementations/session-repository";

const sessionRepository = new SessionRepository();

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ message: "Token invalid or expired" });
  }

  const { sub, sid } = req.user;

  if (!sid) {
    return reply.status(401).send({ message: "Invalid session" });
  }

  const session = await sessionRepository.findActiveById(sid);

  if (!session || session.userId !== sub) {
    return reply.status(401).send({ message: "Session closed" });
  }
}