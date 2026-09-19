import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import pool, { query } from '../config/bd.js';
import { errorHandler } from '../utils/errorHandler.js';

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, gameId, maxPlayers, startsAt, language, micRequired, description } = req.body;
    const ownerId = req.user?.userId;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const sql = `
            INSERT INTO sessions (title, game_id, max_players, starts_at, language, mic_required, description, owner_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, title, game_id, max_players, starts_at, language, mic_required, description, owner_id
        `;

        const session = await client.query(sql, [
            title,
            gameId,
            maxPlayers,
            startsAt,
            language,
            micRequired,
            description,
            ownerId,
        ]);

        const ownerRole = 'owner';

        const roleSql = `
            INSERT INTO session_members (session_id, user_id, role)
            VALUES ($1, $2, $3)
            RETURNING id, session_id, user_id, role, joined_at
        `;

        const owner = await client.query(roleSql, [session.rows[0].id, ownerId, ownerRole]);

        await client.query('COMMIT');

        res.status(201).json({
            session: session.rows[0],
            ownerUser: owner.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');

        errorHandler(res, 'Error creating game session', error);
    } finally {
        client.release();
    }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const sql = `
            SELECT s.id, s.title, s.max_players, s.starts_at, s.language, s.mic_required, g.name AS game_name, u.id AS owner_id, u.name AS owner_name
            FROM sessions s
            INNER JOIN games g
            ON s.game_id = g.id
            INNER JOIN users u
            ON s.owner_id = u.id
        `;

        const sessions = await query(sql);

        res.status(200).json({
            sessions: sessions.rows,
        });
    } catch (error) {
        errorHandler(res, 'Error retrieving game sessions', error);
    }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
    const sessionId = Number(req.params.id);

    try {
        const sql = `
            SELECT s.id, s.title, s.max_players, s.starts_at, s.language, s.mic_required, g.name AS game_name, u.id AS owner_id, u.name AS owner_name, COUNT(sm.id) AS current_players
            FROM sessions s
            INNER JOIN games g
            ON s.game_id = g.id
            INNER JOIN users u
            ON s.owner_id = u.id
            INNER JOIN session_members sm
            ON s.id = sm.session_id
            WHERE s.id = $1
            GROUP BY s.id
        `;

        const session = await query(sql, [sessionId]);

        if ((session.rowCount ?? 0) === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        res.status(200).json({
            session: session.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error retrieving game session', error);
    }
};

export const getSessionMembers = async (req: Request, res: Response): Promise<void> => {
    const sessionId = Number(req.params.id);

    try {
        const sessionExist = await query('SELECT id FROM sessions WHERE id = $1', [sessionId]);

        if (sessionExist.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        const sqlMembers = `
            SELECT sm.role, sm.joined_at, u.id, u.name, u.avatar_url, u.rating_sum, u.rating_count
            FROM session_members sm
            INNER JOIN users u
            ON sm.user_id = u.id
            WHERE sm.session_id = $1
        `;

        const sessionMembers = await query(sqlMembers, [sessionId]);

        res.status(200).json({
            members: sessionMembers.rows,
        });
    } catch (error) {
        errorHandler(res, 'Error retrieving session members', error);
    }
};

export const joinSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = Number(req.params.id);
    const memberId = req.user?.userId;

    try {
        const session = await query('SELECT s.id, s.max_players FROM sessions s WHERE s.id = $1', [
            sessionId,
        ]);

        if (session.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        const currentPlayersSql = `
            SELECT COUNT(sm.user_id) AS current_players
            FROM session_members sm
            WHERE sm.session_id = $1
        `;

        const currentPlayers = await query(currentPlayersSql, [sessionId]);

        const currentPlayersCount = Number(currentPlayers.rows[0].current_players);
        const maxPlayers = session.rows[0].max_players;

        if (currentPlayersCount >= maxPlayers) {
            res.status(409).json({ message: 'Sorry, but the session is full of players' });
            return;
        }

        const memberExist = await query(
            `
                SELECT id
                FROM session_members
                WHERE session_id = $1 AND user_id = $2
            `,
            [sessionId, memberId],
        );

        if ((memberExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The user is already part of this session' });
            return;
        }

        const sql = `
            INSERT INTO session_members (session_id , user_id)
            VALUES ($1, $2)
            RETURNING session_id, user_id, role, joined_at 
        `;

        const sessionMember = await query(sql, [sessionId, memberId]);

        res.status(201).json({
            session_member: sessionMember.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Failed to join the session', error);
    }
};

export const leaveSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const sessionId = Number(req.params.id);
    const userId = req.user?.userId;

    try {
        const session = await query('SELECT id FROM sessions WHERE id = $1', [sessionId]);

        if (session.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        const sqlExist = `
            SELECT role
            FROM session_members 
            WHERE session_id = $1 AND user_id = $2
        `;

        const userExist = await query(sqlExist, [sessionId, userId]);

        if (userExist.rowCount === 0) {
            res.status(409).json({ message: 'The user is not a participant in the session' });
            return;
        }

        if (userExist.rows[0].role === 'member') {
            const deleteMember = await query(
                'DELETE FROM session_members WHERE session_id = $1 AND user_id = $2 RETURNING id',
                [sessionId, userId],
            );

            if (deleteMember.rowCount === 0) {
                res.status(404).json({ message: 'User not found in this session' });
                return;
            }

            res.status(200).json({
                message: 'User leave this session successfully',
            });

            return;
        }

        const deleteSession = await query('DELETE FROM sessions WHERE id = $1 RETURNING id', [
            sessionId,
        ]);

        if (deleteSession.rowCount === 0) {
            res.status(404).json({ message: 'Session not found for deletion' });
            return;
        }

        res.status(200).json({ message: 'User leave and deletion session successfully' });
    } catch (error) {
        errorHandler(res, 'Failed to leave the session', error);
    }
};
