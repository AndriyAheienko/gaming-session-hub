import type { Request, Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import query from '../config/bd.js';
import { errorHandler } from '../utils/errorHandler.js';

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const { title, gameId, maxPlayers, startsAt, language, micRequired, description } = req.body;
    const ownerId = req.user?.userId;

    try {
        const sql = `
            INSERT INTO sessions (title, game_id, max_players, starts_at, language, mic_required, description, owner_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const session = await query(sql, [
            title,
            gameId,
            maxPlayers,
            startsAt,
            language,
            micRequired,
            description,
            ownerId,
        ]);

        res.status(201).json({
            session: session.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error creating game session', error);
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
            SELECT s.id, s.title, s.max_players, s.starts_at, s.language, s.mic_required, g.name AS game_name, u.id AS owner_id, u.name AS owner_name
            FROM sessions s
            INNER JOIN games g
            ON s.game_id = g.id
            INNER JOIN users u
            ON s.owner_id = u.id
            WHERE s.id = $1
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
        errorHandler(res, 'Error retrieving game sessions', error);
    }
};

/* ПЕРЕРОБИТИ */
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

        if (session.rows[0].max_players === 5) {
            res.status(409).json({ message: 'Sorry, but the session is full of players' });
            return;
        }

        const memberExist = await query(
            `
                SELECT s.id FROM sessions
                INNER JOIN session_members sm
                ON s.id = sm.session_id
                WHERE s.id = $1
            `,
            [memberId],
        );

        if ((memberExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The user is already part of this session' });
            return;
        }

        const sql = `
            INSERT INTO session_members (session_id , user_id, role)
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
