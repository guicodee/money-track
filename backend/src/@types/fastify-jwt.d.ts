import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; email: string; sid?: number };
    user: { sub: number; email: string; sid: number };
  }
}
