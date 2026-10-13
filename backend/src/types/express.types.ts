import type { Request } from 'express';
import type { Server } from 'socket.io';

export interface AuthRequest extends Request {
    user?: {
        userId: number;
    };
}
