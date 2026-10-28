import { FastifyInstance } from 'fastify';
import { AutenticateController } from './autenticate.controller';
import { CreateUserController } from './create-user.controller';
import { deleteUserController } from './delete-user.controller';
import { getMeController } from './get-me.controller';
import { logoutController } from './logout.controller';
import { refreshTokenController } from './refresh-token.controller';

export async function usersRoutes(app: FastifyInstance) {
	app.post('/users/register', CreateUserController);
	app.post('/users/autenticate', AutenticateController);
  app.post("/auth/refresh", refreshTokenController);

  app.post(
    "/auth/logout",
    { preHandler: [app.authenticate] },
    logoutController
  );

  app.get(
    "/users/me",
    { preHandler: [app.authenticate] },
    getMeController
  );

  app.delete(
    "/users/me",
    { preHandler: [app.authenticate] },
    deleteUserController
  );
}