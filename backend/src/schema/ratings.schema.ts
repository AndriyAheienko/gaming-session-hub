import z from 'zod';

export const ratingsParamsSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
});

export const ratingBodySchema = z.object({
    targetId: z.number().int().positive(),
    rating: z.number().int().min(1).max(5),
});
