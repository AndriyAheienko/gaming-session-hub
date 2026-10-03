import z from 'zod';

export const querySchema = z.object({
    searchQuery: z.string().trim(),
    pageSize: z.coerce.number().int().positive().optional(),
});
