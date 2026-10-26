import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { env } from './env'
import { usersRoutes } from './controller/users/routes';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
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

fastify.register(usersRoutes);

fastify
	.listen({
		port: env.PORT,
		host: '0.0.0.0',
	})
	.then(() => {
		console.log('Server is running');
	});