import type { Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';

import type { AuthRequest } from '../types/express.types.js';
import pool from '../config/bd.js';
import { errorZod } from '../utils/errorZod.js';
import { isPostgresError } from '../utils/isPostgresError.js';
import { ratingBodySchema, ratingsParamsSchema } from '../schema/ratings.schema.js';
import { errorTransaction } from '../utils/errorTransaction.js';

export const rateSessionMember = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const raterId = req.user?.userId;

    let client: PoolClient | null = null;

    try {
        if (!raterId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const params = ratingsParamsSchema.parse(req.params);
        const body = ratingBodySchema.parse(req.body);

        if (raterId === body.targetId) {
            res.status(409).json({ message: 'You cannot grade yourself' });
            return;
        }

        client = await pool.connect();
        await client.query('BEGIN');

        const session = await client.query('SELECT id, status FROM sessions WHERE id = $1', [
            params.sessionId,
        ]);

        if (session.rowCount === 0) {
            await errorTransaction(client);
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        if (session.rows[0].status !== 'completed') {
            await errorTransaction(client);
            res.status(409).json({ message: 'The session has not yet concluded' });
            return;
        }

        const membersExists = await client.query(
            `
                SELECT user_id FROM session_members
                WHERE session_id = $1 AND user_id IN ($2, $3)
            `,
            [params.sessionId, raterId, body.targetId],
        );

        if (membersExists.rowCount !== 2) {
            await errorTransaction(client);
            res.status(404).json({
                message: 'The users are not participants in the same session',
            });
            return;
        }

        const ratingExist = await client.query(
            'SELECT id FROM ratings WHERE rater_id = $1 AND target_id = $2 AND session_id = $3 ',
            [raterId, body.targetId, params.sessionId],
        );

        if ((ratingExist.rowCount ?? 0) > 0) {
            await errorTransaction(client);
            res.status(409).json({ message: 'You have already rated this user' });
            return;
        }

        const sqlRating = `
            INSERT INTO ratings (rater_id, target_id, session_id, rating)
            VALUES ($1, $2, $3, $4)
            RETURNING id, rating, created_at
        `;

        const rating = await client.query(sqlRating, [
            raterId,
            body.targetId,
            params.sessionId,
            body.rating,
        ]);

        const notification = await client.query(
            `
            INSERT INTO notifications (actor_id, user_id, type, session_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, actor_id, type, read_at, created_at
        `,
            [raterId, body.targetId, 'new_rating', params.sessionId],
        );

        const sqlUser = `
            UPDATE users SET rating_sum = rating_sum + $1, rating_count = rating_count + 1
            WHERE id = $2
            RETURNING id, name, rating_sum, rating_count, avatar_url
        `;

        const user = await client.query(sqlUser, [body.rating, body.targetId]);

        if (user.rowCount === 0) {
            await errorTransaction(client);
            res.status(409).json({ message: 'Target user not found' });
            return;
        }

        await client.query('COMMIT');

        res.status(201).json({
            rating: rating.rows[0],
            user: user.rows[0],
            notification: notification.rows[0],
        });
    } catch (error) {
        await errorTransaction(client);

        if (errorZod(res, error)) {
            return;
        }

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_rating_per_session'
        ) {
            res.status(409).json({ message: 'You have already rated this user' });
            return;
        }

        next(error);
    } finally {
        if (client) client.release();
    }
};
