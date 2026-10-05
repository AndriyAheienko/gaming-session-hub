import z from 'zod';

export const bodySchema = z.object({
    title: z.string().trim().min(1).max(200),
    maxPlayers: z.number().int().positive().max(100),
    startsAt: z.coerce.date().refine(val => val > new Date(), {
        message: 'The session start time must be in the future',
    }),
    language: z.enum(['eng', 'ua']),
    micRequired: z.boolean(),
    description: z.string().optional(),
    game: z.object({
        rawg_id: z.number().int().positive().min(1),
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
    }),
});

export const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().optional(),
    language: z.enum(['eng', 'ua']).optional(),
    sort: z
        .enum(['newest', 'oldest', 'soonest', 'latest', 'least-free', 'most-free'])
        .default('newest'),
    available: z
        .preprocess(
            val => {
                if (val === 'true') return true;
                if (val === 'false') return false;
            },
            z.boolean({ message: 'Must be true or false' }),
        )
        .default(false),
});

export const sessionIdSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
});

export const sendInvitationParamsSchema = z.object({
    sessionId: z.coerce.number().int().positive(),
    receiverId: z.coerce.number().int().positive(),
});

export const invitationIdSchema = z.object({
    invitationId: z.coerce.number().int().positive(),
});
