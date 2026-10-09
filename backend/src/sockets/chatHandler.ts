import { Server, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import type { Server as HttpServer } from 'http';
import { query } from '../config/bd.js';
import jwt from 'jsonwebtoken';
import { jwtPayloadSchema, authSchema } from '../schema/auth.schema.js';
import { joinSchema, socketSchema, sendSchema } from '../schema/chat.schema.js';
import { errorSocket } from '../utils/errorSocket.js';

export const chatHandler = (httpServer: HttpServer): void => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    });

    io.use((socket: Socket, next) => {
        try {
            const token = authSchema.parse(socket.handshake.auth.token);

            const decoded = jwt.verify(token, env.JWT_SECRET);

            const payload = jwtPayloadSchema.parse(decoded);

            socket.data.userId = payload.userId;

            next();
        } catch (error) {
            console.error('Socket authentication failed:', error);
            next(new Error('Authentication failed: invalid or missing token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('New user connection: ', socket.id);

        socket.on('join_session_chat', async (data, callback) => {
            try {
                const body = joinSchema.parse(data);
                const socketBody = socketSchema.parse(socket.data);

                const roomName = `session_${body.sessionId}`;

                const sql = `
                    SELECT id
                    FROM session_members
                    WHERE session_id = $1 AND user_id = $2
                `;

                const userExist = await query(sql, [body.sessionId, socketBody.userId]);

                if (userExist.rows.length === 0) {
                    if (typeof callback === 'function') {
                        callback({
                            success: false,
                            message: 'The user does not belong to the session',
                        });
                    }
                    return;
                }

                await socket.join(roomName);

                console.log(
                    `User id_${socketBody.userId} successfully entered the room ${body.sessionId}`,
                );

                if (typeof callback === 'function') {
                    callback({ success: true });
                }
            } catch (error) {
                errorSocket(error, callback);
            }
        });

        socket.on('send_message', async (data, callback) => {
            try {
                const body = sendSchema.parse(data);
                const socketBody = socketSchema.parse(socket.data);

                const postMessageSql = `
                    WITH inserted_message AS (
                        INSERT INTO messages (session_id, sender_id, text)
                        SELECT $1, $2, $3
                        WHERE EXISTS (
                            SELECT 1 FROM session_members
                            WHERE session_id = $1 AND user_id = $2
                        )
                        RETURNING id, sender_id, text, created_at
                    )
                    SELECT im.id, im.sender_id, im.text, im.created_at, u.name, u.avatar_url
                    FROM inserted_message im
                    INNER JOIN users u
                    ON im.sender_id = u.id
                `;

                const result = await query(postMessageSql, [
                    body.sessionId,
                    socketBody.userId,
                    body.text,
                ]);

                if (result.rows.length === 0) {
                    if (typeof callback === 'function') {
                        callback({
                            success: false,
                            message: 'The user does not belong to the session',
                        });
                    }
                    return;
                }

                const message = result.rows[0];
                const roomName = `session_${body.sessionId}`;

                io.to(roomName).emit('receive_message', message);

                if (typeof callback === 'function') {
                    callback({ success: true });
                }
            } catch (error) {
                errorSocket(error, callback);
            }
        });

        socket.on('disconnect', () => {
            console.log('User is disconnect: ', socket.id);
        });
    });
};
