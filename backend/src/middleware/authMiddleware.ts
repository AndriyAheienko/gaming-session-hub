import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import jwt from 'jsonwebtoken';

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token as string, process.env.JWT_SECRET as string);
            req.user = decoded as { userId: number };

            next();
        } catch (error) {
            res.status(401).json({ message: 'Token invalid' });
            return;
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Token is missing' });
        return;
    }
};
