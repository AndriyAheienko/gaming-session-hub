import 'dotenv/config';
import z from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(30),
    PORT: z.coerce.number().int().positive(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().trim().min(1),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
    DATABASE_URL: parsedEnv.DATABASE_URL,
    JWT_SECRET: parsedEnv.JWT_SECRET,
    PORT: parsedEnv.PORT,
    NODE_ENV: parsedEnv.NODE_ENV,
    CORS_ORIGIN: parsedEnv.CORS_ORIGIN,
};
