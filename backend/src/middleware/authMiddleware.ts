import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { isValidPayload } from '../utils/isValidPayload.js';

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

        if (!isValidPayload(decoded)) {
            res.status(401).json({
                message: 'Token payload is invalid',
            });
            return;
        }

        req.user = {
            userId: decoded.userId,
        };

        next();
    } catch (error) {
        console.error('Token verification failed:', error);

        res.status(401).json({
            message: 'Token is invalid or expired',
        });
    }
};
