import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { createServer } from 'http';

import { env } from './config/env.js';
import { closePool } from './config/bd.js';
import { chatHandler } from './sockets/chatHandler.js';

import authRoutes from './routes/authRoutes.js';
import sessionsRoutes from './routes/sessionsRoutes.js';
import friendsRoutes from './routes/friendsRoutes.js';
import gamesRoutes from './routes/gamesRoutes.js';

import { errorHandler } from './middleware/errorHandler.js';

const port = env.PORT;

const app = express();

app.use(
    cors({
        origin: env.CORS_ORIGIN,
    }),
);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
    });
});

app.use('/auth', authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/friends', friendsRoutes);
app.use('/games', gamesRoutes);

app.use((_req: Request, res: Response) => {
    res.status(404).json({
        message: 'Route not found',
    });
});

app.use(errorHandler);

const httpServer = createServer(app);

chatHandler(httpServer);

const server = httpServer.listen(port, () => {
    console.log(`Server running on port ${env.PORT}`);
});

const shutdown = async () => {
    try {
        await new Promise<void>((resolve, reject) => {
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await closePool();

        console.log('Server shutdown completed');
    } catch (error) {
        console.error('Error during server shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
