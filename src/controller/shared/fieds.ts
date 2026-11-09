import { z } from "zod";

const PG_INT_MAX = 2_147_483_647;

export const idSchema = z.coerce.number().int().positive().max(PG_INT_MAX); // params e query
export const bodyIdSchema = z.number().int().positive().max(PG_INT_MAX);   // body JSON
export const pageSchema = z.coerce.number().int().min(1).max(1_000_000).default(1);