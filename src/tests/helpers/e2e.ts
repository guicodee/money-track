import { buildApp } from "@src/app";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";

export const PASSWORD = "senha-segura-123";
export const PAST_DATE = "2020-01-01";
export const FUTURE_DATE = "2999-01-01";

export async function buildTestApp() {
  const app = buildApp();
  await app.ready();
  return app;
}

let seq = 0;

export async function registerAndLogin(app: FastifyInstance) {
  const n = ++seq;
  const email = `e2e${n}@test.com`;

  const reg = await app.inject({
    method: "POST",
    url: "/users/register",
    payload: { name: `User ${n}`, email, password: PASSWORD },
  });
  if (reg.statusCode !== 201) throw new Error(`register falhou: ${reg.statusCode} ${reg.body}`);

  const login = await app.inject({
    method: "POST",
    url: "/users/autenticate",
    payload: { email, password: PASSWORD },
  });
  if (login.statusCode !== 200) throw new Error(`login falhou: ${login.statusCode} ${login.body}`);

  const { accessToken, user } = login.json();
  const refreshToken = login.cookies.find((c) => c.name === "refreshToken")!.value;
  const sid = (app.jwt.decode(accessToken) as { sid: number }).sid;

  return {
    id: user.id as number,
    email,
    accessToken,
    refreshToken,
    sid,
    headers: { authorization: `Bearer ${accessToken}` },
  };
}
export type TestUser = Awaited<ReturnType<typeof registerAndLogin>>;

export function clientFor(app: FastifyInstance, user?: TestUser) {
  const call = (method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: object) =>
    app.inject({ method, url, payload, headers: user?.headers });
  return {
    get: (url: string) => call("GET", url),
    post: (url: string, payload?: object) => call("POST", url, payload),
    patch: (url: string, payload?: object) => call("PATCH", url, payload),
    del: (url: string) => call("DELETE", url),
  };
}
export type Api = ReturnType<typeof clientFor>;

function mustBe(res: LightMyRequestResponse, status: number, what: string) {
  if (res.statusCode !== status) throw new Error(`${what}: esperado ${status}, veio ${res.statusCode} ${res.body}`);
  return res.json();
}

export async function setupUserWithAccount(app: FastifyInstance, initialBalance = "1000.00") {
  const user = await registerAndLogin(app);
  const api = clientFor(app, user);

  const account = mustBe(await api.post("/accounts", { name: "Principal", initialBalance }), 201, "conta");
  const expenseCat = mustBe(await api.post("/categories", { description: "Mercado", categoryType: "EXPENSE" }), 201, "cat EXPENSE");
  const incomeCat = mustBe(await api.post("/categories", { description: "Salário", categoryType: "INCOME" }), 201, "cat INCOME");

  const base = { description: "Teste", accountId: account.id };
  type Extra = Record<string, unknown>;

  return {
    user, api, account, expenseCat, incomeCat,
    income: (amount: string, occurredAt = PAST_DATE, extra: Extra = {}) =>
      ({ ...base, operationType: "INCOME", categoryId: incomeCat.id, amount, occurredAt, ...extra }),
    expense: (amount: string, occurredAt = PAST_DATE, extra: Extra = {}) =>
      ({ ...base, operationType: "EXPENSE", categoryId: expenseCat.id, amount, occurredAt, ...extra }),
    transfer: (amount: string, occurredAt = PAST_DATE, extra: Extra = {}) =>
      ({ ...base, operationType: "TRANSFER", categoryId: null, amount, occurredAt, ...extra }),
  };
}
export type Ctx = Awaited<ReturnType<typeof setupUserWithAccount>>;

export async function balanceOf(api: Api) {
  return (await api.get("/accounts/me")).json().currentBalance as string;
}

export async function createTx(api: Api, payload: object) {
  return mustBe(await api.post("/transactions", payload), 201, "transação");
}