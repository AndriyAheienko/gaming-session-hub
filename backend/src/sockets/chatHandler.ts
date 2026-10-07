import { Server } from 'socket.io';
import { env } from '../config/env.js';
import type { Server as HttpServer } from 'http';
import { query } from '../config/bd.js';
import jwt from 'jsonwebtoken';
import { jwtPayloadSchema } from '../schema/auth.schema.js';

export const chatHandler = (httpServer: HttpServer): void => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    });

    io.use((socket, next) => {
        const authorization = socket.handshake.auth.token;

        if (
            !authorization ||
            typeof authorization !== 'string' ||
            !authorization.startsWith('Bearer ')
        ) {
            return next(new Error('Token is missing or invalid'));
        }

        const token = authorization.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error'));
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET);

            const payload = jwtPayloadSchema.parse(decoded);

            if (!payload) {
                return next(new Error('Token payload is invalid'));
            }

            socket.data.userId = payload.userId;

            next();
        } catch (error) {
            console.error('Token verification failed:', error);

            return next(new Error('Token is invalid or expired'));
        }
    });

    io.on('connection', socket => {
        console.log('New user connection: ', socket.id);

        socket.on('join_session_chat', async (data, callback) => {
            const roomName = `session_${data.sessionId}`;

            const sql = `
                SELECT id
                FROM session_members
                WHERE session_id = $1 AND user_id = $2
            `;

            const userExist = await query(sql, [data.sessionId, socket.data.userId]);

            if (userExist.rowCount === 0) {
                callback({
                    success: false,
                    message: 'The user does not belong to the session',
                });
                return;
            }

            socket.join(roomName);

            console.log(
                `User id_${socket.data.userId} successfully entered the room ${data.sessionId}`,
            );

            callback({ success: true });
        });

        socket.on('send_message', async (data, callback) => {
            const roomName = `session_${data.sessionId}`;

            const sql = `
                SELECT id
                FROM session_members
                WHERE session_id = $1 AND user_id = $2
            `;

            const userExist = await query(sql, [data.sessionId, socket.data.userId]);

            if (userExist.rowCount === 0) {
                callback({
                    success: false,
                    message: 'The user does not belong to the session',
                });
                return;
            }

            try {
                const newMessage = await query(
                    `
                    INSERT INTO messages (session_id, sender_id, text)
                    VALUES ($1, $2, $3)
                    RETURNING id, text, created_at
                `,
                    [data.sessionId, socket.data.userId, data.text],
                );

                const userInfo = await query('SELECT name, avatar_url FROM users WHERE id = $1', [
                    socket.data.userId,
                ]);

                const result = {
                    id: newMessage.rows[0].id,
                    text: newMessage.rows[0].text,
                    created_at: newMessage.rows[0].created_at,
                    name: userInfo.rows[0].name,
                    avatar_url: userInfo.rows[0].avatar_url,
                };

                io.to(roomName).emit('receive_message', result);

                callback({ success: true });
            } catch (error) {
                console.error('Error sending message: ', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User is disconnect: ', socket.id);
        });
    });
};
