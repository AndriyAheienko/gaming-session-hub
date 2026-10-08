import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { jwtPayloadSchema, authSchema } from '../schema/auth.schema.js';

export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
        const token = authSchema.parse(req.headers.authorization);

        if (!token) {
            res.status(401).json({
                message: 'Authentication error',
            });
            return;
        }

        const decoded = jwt.verify(token, env.JWT_SECRET);

        const payload = jwtPayloadSchema.parse(decoded);

        req.user = {
            userId: payload.userId,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);

        res.status(401).json({
            message: 'Token is invalid or expired',
        });
    }
};
