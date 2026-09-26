import z from 'zod';

export const registerSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().pipe(z.email()),
    password: z.string().min(6),
});

export const loginSchema = z.object({
    email: z.string().trim().pipe(z.email()),
    password: z.string(),
});
