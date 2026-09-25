import type { Response } from 'express';

import type { AuthRequest } from '../types/express.types.js';
import pool, { query } from '../config/bd.js';
import { errorHandler } from '../utils/errorHandler.js';
import { isPostgresError } from '../utils/isPostgresError.js';

export const rateSessionMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const raterId = req.user?.userId;
    const targetId = Number(req.body.targetId);
    const sessionId = Number(req.params.sessionId);
    const ratingNum = Number(req.body.rating);

    let client = null;

    try {
        if (!raterId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        if (
            !Number.isFinite(targetId) ||
            !Number.isInteger(targetId) ||
            targetId <= 0 ||
            !Number.isFinite(sessionId) ||
            !Number.isInteger(sessionId) ||
            sessionId <= 0
        ) {
            res.status(400).json({ message: 'Error while assigning a grade' });
            return;
        }

        if (
            !Number.isFinite(ratingNum) ||
            ratingNum < 1 ||
            ratingNum > 5 ||
            !Number.isInteger(ratingNum)
        ) {
            res.status(400).json({ message: 'Error while assigning a grade' });
            return;
        }

        const session = await query('SELECT id, status FROM sessions WHERE id = $1', [sessionId]);

        if (session.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        if (session.rows[0].status !== 'completed') {
            res.status(409).json({ message: 'The session has not yet concluded' });
            return;
        }

        const meExist = await query(
            'SELECT id FROM session_members WHERE session_id = $1 AND user_id = $2',
            [sessionId, raterId],
        );

        if (meExist.rowCount === 0) {
            res.status(404).json({
                message: 'You are not a participant in the player evaluation session',
            });
            return;
        }

        if (raterId === targetId) {
            res.status(409).json({ message: 'You cannot grade yourself' });
            return;
        }

        const targetExist = await query(
            'SELECT id FROM session_members WHERE session_id = $1 AND user_id = $2',
            [sessionId, targetId],
        );

        if (targetExist.rowCount === 0) {
            res.status(404).json({
                message: 'User are not a participant in the player evaluation session.',
            });
            return;
        }

        const ratingExist = await query(
            'SELECT id FROM ratings WHERE rater_id = $1 AND target_id = $2 AND session_id = $3 ',
            [raterId, targetId, sessionId],
        );

        if ((ratingExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'You have already rated this user' });
            return;
        }

        client = await pool.connect();

        await client.query('BEGIN');

        const sqlRating = `
            INSERT INTO ratings (rater_id, target_id, session_id, rating)
            VALUES ($1, $2, $3, $4)
            RETURNING id, rating, created_at
        `;

        const rating = await client.query(sqlRating, [raterId, targetId, sessionId, ratingNum]);

        const sqlUser = `
            UPDATE users SET rating_sum = rating_sum + $1, rating_count = rating_count + 1
            WHERE id = $2
            RETURNING id, name, rating_sum, rating_count, avatar_url
        `;

        const user = await client.query(sqlUser, [ratingNum, targetId]);

        await client.query('COMMIT');

        res.status(201).json({
            rating: rating.rows[0],
            user: user.rows[0],
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_rating_per_session'
        ) {
            res.status(409).json({ message: 'You have already rated this user' });
            return;
        }

        errorHandler(res, 'Error while attempting to rate the player', error);
    } finally {
        if (client) client.release();
    }
};
