import z from 'zod';

export const envSchema = z.object({
    DATABASE_URL: z.string().trim().min(1),
    JWT_SECRET: z.string().trim().min(30),
    PORT: z.coerce.number().int().positive(),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    CORS_ORIGIN: z.string().trim().min(1),
    RAWG_API_KEY: z.string().trim().min(1),
});
