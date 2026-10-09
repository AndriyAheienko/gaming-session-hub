import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { jwtPayloadSchema, authSchema } from '../schema/auth.schema.js';
import z from 'zod';

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    let payload: { userId: number };

    try {
        const token = authSchema.parse(req.headers.authorization);
        const decoded = jwt.verify(token, env.JWT_SECRET);
        payload = jwtPayloadSchema.parse(decoded);
    } catch (error) {
        if (error instanceof z.ZodError || error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: 'Authentication failed',
            });
            return;
        }

        next(error);
        return;
    }

    req.user = {
        userId: payload.userId,
    };
    next();
};
