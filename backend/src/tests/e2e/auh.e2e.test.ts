import { db } from "@src/db";
import { sessionsTable } from "@src/db/schema/sessions";
import { usersTable } from "@src/db/schema/users";
import { hashToken } from "@src/utils/token";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PASSWORD, buildTestApp, clientFor, registerAndLogin, setupUserWithAccount } from "../helpers/e2e";
import { resetDatabase } from "../setup/db";

let app: FastifyInstance;
beforeAll(async () => { app = await buildTestApp(); });
afterAll(() => app.close());
beforeEach(resetDatabase);

describe("POST /users/register", () => {
  it("cadastra e não expõe a senha", async () => {
    const res = await app.inject({
      method: "POST", url: "/users/register",
      payload: { name: "Ana", email: "ana@test.com", password: PASSWORD },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ name: "Ana", email: "ana@test.com" });
    expect(res.json()).toHaveProperty("createdAt");
    expect(res.json()).not.toHaveProperty("password");
  });

  it("grava a senha como hash bcrypt, nunca em texto puro", async () => {
    await app.inject({
      method: "POST", url: "/users/register",
      payload: { name: "Ana", email: "ana@test.com", password: PASSWORD },
    });

    const [row] = await db.select().from(usersTable);
    expect(row.password).not.toBe(PASSWORD);
    expect(row.password).toMatch(/^\$2[aby]\$/);
  });

  it("rejeita e-mail duplicado com 409", async () => {
    const payload = { name: "Ana", email: "ana@test.com", password: PASSWORD };
    await app.inject({ method: "POST", url: "/users/register", payload });

    const res = await app.inject({ method: "POST", url: "/users/register", payload });

    expect(res.statusCode).toBe(409);
  });

  it.each([
    ["nome curto", { name: "A", email: "a@test.com", password: PASSWORD }],
    ["e-mail inválido", { name: "Ana", email: "nao-é-email", password: PASSWORD }],
    ["senha com 7 caracteres", { name: "Ana", email: "a@test.com", password: "1234567" }],
    ["campos ausentes", {}],
  ])("rejeita payload inválido com 400: %s", async (_label, payload) => {
    const res = await app.inject({ method: "POST", url: "/users/register", payload });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe("Validation error");
  });
});

describe("POST /users/autenticate", () => {
  it("autentica, devolve accessToken e usuário sem senha, e seta o cookie do refresh", async () => {
    const u = await registerAndLogin(app);

    const res = await app.inject({
      method: "POST", url: "/users/autenticate",
      payload: { email: u.email, password: PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toEqual(expect.any(String));
    expect(res.json().user).toEqual({ id: u.id, name: expect.any(String), email: u.email });
    const cookie = res.cookies.find((c) => c.name === "refreshToken");
    expect(cookie).toMatchObject({ httpOnly: true, path: "/auth" });
  });

  it("cria exatamente uma sessão por login, gravando o hash SHA-256 do refresh token", async () => {
    const u = await registerAndLogin(app);

    const sessions = await db.select().from(sessionsTable).where(eq(sessionsTable.userId, u.id));

    expect(sessions).toHaveLength(1);
    expect(sessions[0].refreshTokenHash).toBe(hashToken(u.refreshToken));
    expect(sessions[0].refreshTokenHash).not.toBe(u.refreshToken);
  });

  it("e-mail inexistente e senha errada retornam a mesma resposta (sem enumeração de usuários)", async () => {
    const u = await registerAndLogin(app);

    const wrongPass = await app.inject({ method: "POST", url: "/users/autenticate", payload: { email: u.email, password: "senha-errada-1" } });
    const unknown = await app.inject({ method: "POST", url: "/users/autenticate", payload: { email: "x@test.com", password: PASSWORD } });

    expect(wrongPass.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrongPass.json()).toEqual(unknown.json());
  });

  it("rejeita payload inválido com 400", async () => {
    const res = await app.inject({ method: "POST", url: "/users/autenticate", payload: { email: "x", password: "1" } });
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /auth/refresh", () => {
  it("rotaciona: emite novos tokens, revoga o antigo e o reuso do antigo falha", async () => {
    const u = await registerAndLogin(app);

    const res = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: u.refreshToken } });

    expect(res.statusCode).toBe(200);
    const newAccess = res.json().accessToken as string;
    const newRefresh = res.cookies.find((c) => c.name === "refreshToken")!.value;
    expect(newRefresh).not.toBe(u.refreshToken);

    const me = await app.inject({ method: "GET", url: "/users/me", headers: { authorization: `Bearer ${newAccess}` } });
    expect(me.statusCode).toBe(200);

    const reuse = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: u.refreshToken } });
    expect(reuse.statusCode).toBe(401);

    const again = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: newRefresh } });
    expect(again.statusCode).toBe(200);
  });

  it("grava só o hash do novo refresh token", async () => {
    const u = await registerAndLogin(app);

    const res = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: u.refreshToken } });
    const newRefresh = res.cookies.find((c) => c.name === "refreshToken")!.value;

    const sessions = await db.select().from(sessionsTable);
    const hashes = sessions.map((s) => s.refreshTokenHash);
    expect(hashes).toContain(hashToken(newRefresh));
    expect(hashes).not.toContain(newRefresh);
  });

  it("rejeita sem cookie e com cookie inválido", async () => {
    expect((await app.inject({ method: "POST", url: "/auth/refresh" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: "lixo" } })).statusCode).toBe(401);
  });

  it("rejeita sessão expirada", async () => {
    const u = await registerAndLogin(app);
    await db.update(sessionsTable).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(sessionsTable.userId, u.id));

    const res = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: u.refreshToken } });

    expect(res.statusCode).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("encerra a sessão: o access token e o refresh token deixam de funcionar", async () => {
    const u = await registerAndLogin(app);
    const api = clientFor(app, u);

    const res = await api.post("/auth/logout");
    expect(res.statusCode).toBe(200);

    expect((await api.get("/users/me")).statusCode).toBe(401);
    const refresh = await app.inject({ method: "POST", url: "/auth/refresh", cookies: { refreshToken: u.refreshToken } });
    expect(refresh.statusCode).toBe(401);
  });

  it("logout de um usuário não derruba a sessão de outro", async () => {
    const [a, b] = [await registerAndLogin(app), await registerAndLogin(app)];

    await clientFor(app, a).post("/auth/logout");

    expect((await clientFor(app, b).get("/users/me")).statusCode).toBe(200);
  });
});

describe("GET /users/me", () => {
  it("retorna o próprio usuário, sem a senha", async () => {
    const u = await registerAndLogin(app);

    const res = await clientFor(app, u).get("/users/me");

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ id: u.id, email: u.email });
    expect(res.json()).not.toHaveProperty("password");
  });
});

describe("DELETE /users/me", () => {
  it("exclui o usuário sem conta e invalida o token", async () => {
    const u = await registerAndLogin(app);
    const api = clientFor(app, u);

    const res = await api.del("/users/me");

    expect([200, 204]).toContain(res.statusCode);
    expect(await db.select().from(usersTable).where(eq(usersTable.id, u.id))).toHaveLength(0);
    expect((await api.get("/users/me")).statusCode).toBe(401);
  });

  it.todo("usuário com conta: definir o comportamento esperado (hoje a FK restrict gera 500)");

  it("usuário com conta: 409 claro, nada é apagado e a sessão continua válida", async () => {
    const c = await setupUserWithAccount(app);

    const res = await c.api.del("/users/me");

    expect(res.statusCode).toBe(409);
    expect((await c.api.get("/users/me")).statusCode).toBe(200);
    expect((await c.api.get("/accounts/me")).statusCode).toBe(200);
  });

  it("usuário só com categorias (sem conta): 409", async () => {
    const u = await registerAndLogin(app);
    const api = clientFor(app, u);
    await api.post("/categories", { description: "Lazer", categoryType: "EXPENSE" });

    expect((await api.del("/users/me")).statusCode).toBe(409);
  });
});

describe("middleware authenticate", () => {
  const protectedRoutes: [string, string][] = [
    ["GET", "/users/me"], ["DELETE", "/users/me"], ["POST", "/auth/logout"],
    ["GET", "/accounts/me"], ["POST", "/accounts"], ["PATCH", "/accounts/me"], ["DELETE", "/accounts/me"],
    ["GET", "/categories"], ["GET", "/categories/1"], ["POST", "/categories"], ["PATCH", "/categories/1"], ["DELETE", "/categories/1"],
    ["GET", "/transactions"], ["GET", "/transactions/1"], ["POST", "/transactions"], ["PATCH", "/transactions/1"], ["DELETE", "/transactions/1"],
  ];

  it.each(protectedRoutes)("exige autenticação", async (method, url) => {
    const none = await app.inject({ method: method as "GET", url });
    const bad = await app.inject({ method: method as "GET", url, headers: { authorization: "Bearer abc" } });

    expect(none.statusCode).toBe(401);
    expect(bad.statusCode).toBe(401);
  });

  it("rejeita token válido sem sid", async () => {
    const token = app.jwt.sign({ sub: 1, email: "x@test.com" } as never);

    const res = await app.inject({ method: "GET", url: "/users/me", headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(401);
  });

  it("rejeita token cujo sid não existe", async () => {
    const token = app.jwt.sign({ sub: 1, email: "x@test.com", sid: 999999 });

    const res = await app.inject({ method: "GET", url: "/users/me", headers: { authorization: `Bearer ${token}` } });

    expect(res.statusCode).toBe(401);
  });

  it("rejeita sub de um usuário com sid de outro (sessão não pertence ao usuário)", async () => {
    const [a, b] = [await registerAndLogin(app), await registerAndLogin(app)];
    const forged = app.jwt.sign({ sub: b.id, email: b.email, sid: a.sid });

    const res = await app.inject({ method: "GET", url: "/users/me", headers: { authorization: `Bearer ${forged}` } });

    expect(res.statusCode).toBe(401);
  });

  it("rejeita sessão expirada", async () => {
    const u = await registerAndLogin(app);
    await db.update(sessionsTable).set({ expiresAt: new Date(Date.now() - 60_000) }).where(eq(sessionsTable.id, u.sid));

    expect((await clientFor(app, u).get("/users/me")).statusCode).toBe(401);
  });
});