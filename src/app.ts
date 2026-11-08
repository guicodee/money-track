import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import Fastify from "fastify";
import { ZodError } from "zod";
import { accountsRoutes } from "./controller/account/routes";
import { categoryRoutes } from "./controller/category/routes";
import { transactionRoutes } from "./controller/transaction/routes";
import { usersRoutes } from "./controller/users/routes";
import { env } from "./env";
import { AppError, isNumericOutOfRange } from "./errors/error";
import { authenticate } from "./middlewares/authenticate";

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });

  app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES },
  });
  app.decorate("authenticate", authenticate);
  app.register(fastifyCookie);

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: "Validation error",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    if (isNumericOutOfRange(error)) {
      return reply.status(400).send({ message: "Amount out of the allowed range" });
    }
    
    req.log.error(error);
    return reply.status(500).send({ message: "Internal server error" });
  });

  app.register(usersRoutes);
  app.register(accountsRoutes);
  app.register(categoryRoutes);
  app.register(transactionRoutes);

  return app;
}