import z from 'zod';

export const registerSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().pipe(z.email()),
    password: z.string().min(8),
});

export const loginSchema = z.object({
    email: z.string().trim().pipe(z.email()),
    password: z.string(),
});

export const jwtPayloadSchema = z.object({
    userId: z.number().int().positive(),
});
