import type { FastifyInstance } from "fastify";
import { createAccountController } from "./create-account.controller";
import { deleteAccountController } from "./delete-account.controller";
import { getMyAccountController } from "./get-my-account.controller";
import { updateAccountController } from "./update-account.controller";

export async function accountsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/accounts", createAccountController);
  app.get("/accounts/me", getMyAccountController);
  app.patch("/accounts/me", updateAccountController);
  app.delete("/accounts/me", deleteAccountController);
}