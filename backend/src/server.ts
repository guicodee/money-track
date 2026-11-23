import { buildApp } from "./app";
import { env } from "./env";
import { startDueTransactionsJob } from "./utils/proccess-due-transactions";

const fastify = buildApp();

fastify.addHook("onReady", async () => startDueTransactionsJob(fastify));

fastify
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => console.log("Server is running"));