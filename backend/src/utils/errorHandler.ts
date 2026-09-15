import type { Response } from 'express';

export const errorHandler = (res: Response, textError: string, error: unknown): void => {
    if (error instanceof Error) {
        console.error(`${textError}`, error.message);
    } else {
        console.error('Error unknow:', error);
    }

    res.status(500).json({ message: `Server ${textError}` });
};
