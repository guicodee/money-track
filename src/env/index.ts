import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
	PORT: z.coerce.number().default(3333),
	DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	JWT_ACCESS_EXPIRES: z.string(),
	JWT_REFRESH_EXPIRES: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
	console.log('Invalid environment variables', _env.error.format());

	throw new Error('Invalid environment variables');
}

export const env = _env.data;