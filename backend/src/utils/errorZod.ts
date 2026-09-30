import type { Response } from 'express';
import z from 'zod';

export const errorZod = (res: Response, error: unknown): boolean => {
    if (error instanceof z.ZodError) {
        const errors = error.issues.reduce<Record<string, string>>((acc, error) => {
            const [key] = error.path;

            if (typeof key === 'string') {
                acc[key] = error.message;
            }

            return acc;
        }, {});
        res.status(400).json({ message: 'Validation failed', errors });
        return true;
    }

    return false;
};
