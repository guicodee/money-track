import type { FastifyInstance } from "fastify";
import { authenticate } from "@src/middlewares/authenticate";
import { createTransactionController } from "./create-transaction.controller";
import { listTransactionsController } from "./list-transactions.controller";
import { getTransactionController } from "./get-transaction.controller";
import { updateTransactionController } from "./update-transaction.controller";
import { deleteTransactionController } from "./delete-transaction.controller";

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook("onRequest", authenticate);

  app.get("/transactions", listTransactionsController);
  app.get("/transactions/:id", getTransactionController);
  app.post("/transactions", createTransactionController);
  app.patch("/transactions/:id", updateTransactionController);
  app.delete("/transactions/:id", deleteTransactionController);
}