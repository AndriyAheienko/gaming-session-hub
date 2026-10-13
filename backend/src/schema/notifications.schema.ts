import z from 'zod';

export const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const notificationId = z.object({
    notificationId: z.coerce.number().int().positive(),
});
