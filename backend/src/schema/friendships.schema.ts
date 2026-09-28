import z from 'zod';

export const receiverSchema = z.object({
    receiverId: z.coerce.number().int().positive(),
});

export const friendshipSchema = z.object({
    friendshipId: z.coerce.number().int().positive(),
});
