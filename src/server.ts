import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { accountsRoutes } from './controller/account/routes';
import { usersRoutes } from './controller/users/routes';
import { env } from './env';
import { AppError } from './errors/error';
import { authenticate } from './middlewares/authenticate';

export const fastify = Fastify({
  logger: true
})

fastify.register(fastifyJwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  },
});

fastify.decorate('authenticate', authenticate);
fastify.register(fastifyCookie);

fastify.setErrorHandler((error, req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error",
      issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  req.log.error(error);
  return reply.status(500).send({ message: "Internal server error" });
});

fastify.register(usersRoutes);
fastify.register(accountsRoutes);

fastify
	.listen({
		port: env.PORT,
		host: '0.0.0.0',
	})
	.then(() => {
		console.log('Server is running');
	});