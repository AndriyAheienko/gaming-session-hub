import z from 'zod';

export const joinSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
});

export const socketSchema = z.object({
    userId: z.number().int().positive(),
});

export const sendSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
    text: z.string().trim().min(1),
});
