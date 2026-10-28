import { AppError } from '@src/errors/error';
import { MakeCreateUser } from '@src/services/factory/make-user';
import { FastifyReply, FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
});

const createUserService = MakeCreateUser();

export async function CreateUserController(req: FastifyRequest, reply: FastifyReply) {
  const { email, name, password } = createUserSchema.parse(req.body);
  
	try {
		const { user } = await createUserService.execute({ email, name, password });

    return reply.status(201).send({ 
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
     });

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