import { Server } from 'socket.io';
import { env } from '../config/env.js';
import type { Server as HttpServer } from 'http';
import { query } from '../config/bd.js';

export const chatHandler = (httpServer: HttpServer): void => {
    const io = new Server(httpServer, {
        cors: {
            origin: env.CORS_ORIGIN,
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', socket => {
        console.log('New user connection: ', socket.id);

        socket.on('join_session_chat', data => {
            const roomName = `session_${data.sessionId}`;

            socket.join(roomName);

            console.log(`User id_${data.userId} successfully entered the room ${data.sessionId}`);
        });

        socket.on('send_message', async data => {
            const roomName = `session_${data.sessionId}`;
            try {
                const newMessage = await query(
                    `
                    INSERT INTO messages (session_id, sender_id, text)
                    VALUES ($1, $2, $3)
                    RETURNING id, text, created_at
                `,
                    [data.sessionId, data.senderId, data.text],
                );

                const userInfo = await query('SELECT name, avatar_url FROM users WHERE id = $1', [
                    data.senderId,
                ]);

                const result = {
                    id: newMessage.rows[0].id,
                    text: newMessage.rows[0].text,
                    created_at: newMessage.rows[0].created_at,
                    name: userInfo.rows[0].name,
                    avatar_url: userInfo.rows[0].avatar_url,
                };

                io.to(roomName).emit('receive_message', result);
            } catch (error) {
                console.error('Error sending message: ', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('User is disconnect: ', socket.id);
        });
    });
};
