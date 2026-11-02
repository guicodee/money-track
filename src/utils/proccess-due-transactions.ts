import { MakeProcessDueTransactionsService } from "@src/services/factory/make-transaction";
import { DUE_BATCH_SIZE } from "@src/services/transactions/process-due-transactions.service";
import type { FastifyInstance } from "fastify";

const INTERVAL_MS = 60_000;

export function startDueTransactionsJob(app: FastifyInstance) {
  const service = MakeProcessDueTransactionsService();
  let running = false;

  const run = async () => {
    if (running) return; 
    running = true;
    try {
      let processed: number;
      do {
        processed = await service.execute();
      } while (processed === DUE_BATCH_SIZE); 
    } catch (error) {
      app.log.error(error, "Falha ao processar transações pendentes");
    } finally {
      running = false;
    }
  };

  const timer = setInterval(run, INTERVAL_MS);
  app.addHook("onClose", async () => clearInterval(timer));

  void run();
}