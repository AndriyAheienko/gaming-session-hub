import type { Response, Request, NextFunction } from 'express';

export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void => {
    console.error(error);

    res.status(500).json({ message: 'Internal server error' });
};
