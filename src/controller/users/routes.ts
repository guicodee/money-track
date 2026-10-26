import { FastifyInstance } from 'fastify';
import { CreateUserController } from './create-user.controller';
import { AutenticateController } from './autenticate.controller';
import { refreshTokenController } from './refresh-token.controller';
import { logoutController } from './logout.controller';
import { getMeController } from './get-me.controller';
import { deleteMeController } from './delete-user.controller';

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
    deleteMeController
  );
}