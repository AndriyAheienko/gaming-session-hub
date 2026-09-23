import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import pool, { query } from '../config/bd.js';
import { errorHandler } from '../utils/errorHandler.js';

export const rateSessionMember = async (req: AuthRequest, res: Response): Promise<void> => {
    const raterId = req.user?.userId;
    const targetId = Number(req.body.targetId);
    const sessionId = Number(req.params.sessionId);
    const rating = Number(req.body.rating);

    const client = await pool.connect();

    try {
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

        if (raterId === targetId) {
            res.status(409).json({ message: 'You cannot grade yourself' });
            return;
        }

        if (rating < 1 || rating > 5) {
            res.status(409).json({ message: 'Error while assigning a grade' });
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

        await client.query('BEGIN');

        const sqlRatingCreate = `
            INSERT INTO ratings (rater_id, target_id, session_id, rating)
            VALUES ($1, $2, $3, $4)
            RETURNING id, rating, created_at
        `;

        const createRating = await client.query(sqlRatingCreate, [
            raterId,
            targetId,
            sessionId,
            rating,
        ]);

        const sqlUpdateRanking = `
            UPDATE users SET rating_sum = rating_sum + $1, rating_count = rating_count + 1
            WHERE id = $2
            RETURNING id, name, rating_sum, rating_count, avatar_url
        `;

        const updateRanking = await client.query(sqlUpdateRanking, [rating, targetId]);

        await client.query('COMMIT');

        res.status(201).json({
            createRating: createRating.rows[0],
            updateRanking: updateRanking.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');

        errorHandler(res, 'Error while attempting to rate the player', error);
    } finally {
        client.release();
    }
};
