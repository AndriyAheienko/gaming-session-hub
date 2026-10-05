import z from 'zod';

export const querySchema = z.object({
    searchQuery: z.string().trim(),
    pageSize: z.coerce.number().int().positive().max(40).optional(),
});

export const rawgGameSchema = z.object({
    id: z.number().int().positive().min(1),
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    background_image: z.string().pipe(z.url()).nullable(),
    rating: z.number().nonnegative(),
    genres: z.array(
        z.object({
            id: z.number().int().positive().min(1),
            name: z.string().trim().min(1),
            slug: z.string().trim().min(1),
        }),
    ),
});

export const rawgGamesSchemaResponse = z.object({
    results: z.array(rawgGameSchema),
});
