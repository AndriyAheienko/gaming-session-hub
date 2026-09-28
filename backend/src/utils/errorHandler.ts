import type { Response } from 'express';
import z from 'zod';

export const errorHandler = (res: Response, textError: string, error: unknown): void => {
    if (error instanceof Error) {
        console.error(`${textError}`, error.message);
    } else {
        console.error('Error unknow:', error);
    }

    res.status(500).json({ message: `Server ${textError}` });
};

export const errorZod = (res: Response, error: unknown): boolean => {
    if (error instanceof z.ZodError) {
        const errors = error.issues.reduce(
            (acc, error) => {
                const [key] = error.path;

                if (typeof key === 'string') {
                    acc[key] = error.message;
                }

                return acc;
            },
            {} as Record<string, string>,
        );
        res.status(400).json({ message: 'Validation failed', errors });
        return true;
    }

    return false;
};
