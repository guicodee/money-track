import { AppError } from '@src/errors/error';
import { MakeAutenticate } from '@src/services/factory/make-autenticate';
import { MakeCreateUser } from '@src/services/factory/make-create-user';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';

const autenticateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const autenticateService = MakeAutenticate();

export async function AutenticateController(req: FastifyRequest, reply: FastifyReply) {
  const { email, password } = autenticateSchema.parse(req.body);

  try {
    const { user, accessToken, refreshToken } = await autenticateService.execute({ 
      email, 
      password, 
      userAgent: req.headers['user-agent'], 
      ipAddress: req.ip 
    });

		reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/auth',
      maxAge: 60 * 60 * 24 * 7,
    });

    return reply.status(200).send({ accessToken, user });

  } catch (error) {
    if (error instanceof ZodError) {
      return reply.status(500).send({
        message: 'Validation Error',
        error: JSON.parse(error.message)
      })
    }
    
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }

    throw error;
  }
}