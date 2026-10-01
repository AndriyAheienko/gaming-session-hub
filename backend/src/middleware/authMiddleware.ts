import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { jwtPayloadSchema } from '../schema/auth.schema.js';

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({
            message: 'Token is missing or invalid',
        });
        return;
    }

    const token = authorization.split(' ')[1];

    if (!token) {
        res.status(401).json({
            message: 'Token is missing or invalid',
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET);

        const payload = jwtPayloadSchema.safeParse(decoded);

        if (!payload.success) {
            res.status(401).json({
                message: 'Token payload is invalid',
            });
            return;
        }

        req.user = {
            userId: payload.data.userId,
        };

        next();
    } catch (error) {
        console.error('Token verification failed:', error);

        res.status(401).json({
            message: 'Token is invalid or expired',
        });
    }
};
