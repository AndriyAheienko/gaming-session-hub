import type { Request, Response } from 'express';

import type { AuthRequest } from '../types/express.types.js';
import pool, { query } from '../config/bd.js';
import { errorZod } from '../utils/errorZod.js';
import { isPostgresError } from '../utils/isPostgresError.js';
import {
    bodySchema,
    querySchema,
    sessionIdSchema,
    sendInvitationParamsSchema,
    invitationIdSchema,
} from '../schema/sessions.schema.js';
import { getGameById } from '../services/rawgService.js';

export const createSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const ownerId = req.user?.userId;

    let client = null;

    try {
        if (!ownerId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const body = bodySchema.parse(req.body);

        client = await pool.connect();

        await client.query('BEGIN');

        let gameId: number;

        const existingGame = await client.query('SELECT id FROM games WHERE rawg_id = $1', [
            body.rawg_id,
        ]);

        if ((existingGame.rowCount ?? 0) > 0) {
            gameId = existingGame.rows[0].id;
        } else {
            const rawgGame = await getGameById(body.rawg_id);

            const newGame = await client.query(
                `
                    INSERT INTO games (rawg_id, name, slug, background_image, rating, genres)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (rawg_id)
                    DO UPDATE SET rawg_id = EXCLUDED.rawg_id
                    RETURNING id
                `,
                [
                    rawgGame.rawg_id,
                    rawgGame.name,
                    rawgGame.slug,
                    rawgGame.background_image,
                    rawgGame.rating,
                    rawgGame.genres,
                ],
            );

            gameId = newGame.rows[0].id;
        }

        const sql = `
            INSERT INTO sessions (title, game_id, max_players, starts_at, language, mic_required, description, owner_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, title, game_id, max_players, starts_at, language, mic_required, description, owner_id
        `;

        const session = await client.query(sql, [
            body.title,
            gameId,
            body.maxPlayers,
            body.startsAt,
            body.language,
            body.micRequired,
            body.description,
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
        if (errorZod(res, error)) {
            return;
        }

        if (client) await client.query('ROLLBACK');

        throw error;
    } finally {
        if (client) client.release();
    }
};

export const getSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const reqQuery = querySchema.parse(req.query);

        const offset = (reqQuery.page - 1) * reqQuery.limit;

        let baseQuery = `
            FROM sessions s
            INNER JOIN games g
                ON s.game_id = g.id
            INNER JOIN users u
                ON s.owner_id = u.id
            INNER JOIN session_members sm
                ON s.id = sm.session_id
            WHERE s.status = 'waiting'
        `;
        const values: (string | number)[] = [];
        let paramIndex = 1;

        if (reqQuery.search) {
            values.push(`%${reqQuery.search}%`);
            baseQuery += ` AND (s.title ILIKE $${paramIndex} OR g.name ILIKE $${paramIndex})`;
            paramIndex++;
        }

        if (reqQuery.language) {
            values.push(reqQuery.language);
            baseQuery += ` AND s.language = $${paramIndex}`;
            paramIndex++;
        }

        let availableSql = '';
        if (reqQuery.available) {
            availableSql += 'HAVING COUNT(sm.id) < s.max_players';
        }

        let orderQuery = '';
        switch (reqQuery.sort) {
            case 'newest':
                orderQuery += 'ORDER BY s.created_at DESC';
                break;
            case 'oldest':
                orderQuery += 'ORDER BY s.created_at ASC';
                break;
            case 'soonest':
                orderQuery += 'ORDER BY s.starts_at ASC';
                break;
            case 'latest':
                orderQuery += 'ORDER BY s.starts_at DESC';
                break;
            case 'least-free':
                orderQuery += 'ORDER BY current_players DESC';
                break;
            case 'most-free':
                orderQuery += 'ORDER BY current_players ASC';
                break;
            default:
                orderQuery = 'ORDER BY s.created_at DESC';
                break;
        }

        const mainValues = [...values];

        mainValues.push(reqQuery.limit);
        const limitIndex = paramIndex;
        paramIndex++;

        mainValues.push(offset);
        const offsetIndex = paramIndex;

        const sql = `
            SELECT s.id, s.title, s.max_players, s.starts_at, s.language, s.mic_required, s.created_at, g.name AS game_name, u.id AS owner_id, u.name AS owner_name, COUNT(sm.id) AS current_players
            ${baseQuery}
            GROUP BY s.id
            ${availableSql}
            ${orderQuery}
            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}

        `;

        const sessions = await query(sql, mainValues);

        res.status(200).json({
            sessions: sessions.rows,
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = sessionIdSchema.parse(req.params);

        const sql = `
            SELECT s.id, s.title, s.max_players, s.status, s.starts_at, s.language, s.mic_required, g.name AS game_name, u.id AS owner_id, u.name AS owner_name, COUNT(sm.id) AS current_players
            FROM sessions s
            INNER JOIN games g
                ON s.game_id = g.id
            INNER JOIN users u
                ON s.owner_id = u.id
            LEFT JOIN session_members sm
                ON s.id = sm.session_id
            WHERE s.id = $1
            GROUP BY s.id
        `;

        const session = await query(sql, [data.sessionId]);

        if ((session.rowCount ?? 0) === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        res.status(200).json({
            session: session.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const getSessionMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = sessionIdSchema.parse(req.params);

        const session = await query('SELECT id FROM sessions WHERE id = $1', [data.sessionId]);

        if (session.rowCount === 0) {
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

        const sessionMembers = await query(sqlMembers, [data.sessionId]);

        res.status(200).json({
            members: sessionMembers.rows,
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const joinSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const memberId = req.user?.userId;
    let client = null;

    try {
        if (!memberId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sessionIdSchema.parse(req.params);

        client = await pool.connect();

        await client.query('BEGIN');

        const session = await client.query(
            `SELECT id, max_players, status 
            FROM sessions
            WHERE id = $1 AND status = 'waiting'
            FOR UPDATE`,
            [data.sessionId],
        );

        if (session.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        const currentPlayersSql = `
            SELECT COUNT(user_id) AS current_players
            FROM session_members
            WHERE session_id = $1
        `;

        const currentPlayers = await client.query(currentPlayersSql, [data.sessionId]);

        const currentPlayersCount = Number(currentPlayers.rows[0].current_players);
        const maxPlayers = session.rows[0].max_players;

        if (currentPlayersCount >= maxPlayers) {
            res.status(409).json({ message: 'Sorry, but the session is full of players' });
            await client.query('ROLLBACK');
            return;
        }

        const memberExist = await client.query(
            `
                SELECT id
                FROM session_members
                WHERE session_id = $1 AND user_id = $2
            `,
            [data.sessionId, memberId],
        );

        if ((memberExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The user is already part of this session' });
            await client.query('ROLLBACK');
            return;
        }

        const sql = `
            INSERT INTO session_members (session_id , user_id)
            VALUES ($1, $2)
            RETURNING session_id, user_id, role, joined_at 
        `;

        const sessionMember = await client.query(sql, [data.sessionId, memberId]);

        await client.query('COMMIT');

        res.status(201).json({
            session_member: sessionMember.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (client) await client.query('ROLLBACK');

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_session_member'
        ) {
            res.status(409).json({ message: 'You are already a member of this session' });
            return;
        }

        throw error;
    } finally {
        if (client) client.release();
    }
};

export const leaveSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sessionIdSchema.parse(req.params);

        const session = await query('SELECT id FROM sessions WHERE id = $1', [data.sessionId]);

        if (session.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        const sqlExist = `
            SELECT id, role
            FROM session_members 
            WHERE session_id = $1 AND user_id = $2
        `;

        const userExist = await query(sqlExist, [data.sessionId, userId]);

        if (userExist.rowCount === 0) {
            res.status(409).json({ message: 'The user is not a participant in the session' });
            return;
        }

        if (userExist.rows[0].role === 'owner') {
            res.status(409).json({
                message: 'The session owner cannot leave the session',
            });
            return;
        }

        const exitMember = await query(
            'DELETE FROM session_members WHERE session_id = $1 AND user_id = $2',
            [data.sessionId, userId],
        );

        if (exitMember.rowCount === 0) {
            res.status(404).json({ message: 'User not found in this session' });
            return;
        }

        res.status(200).json({
            message: 'The user has successfully left the session',
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const sendSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const senderId = req.user?.userId;

    try {
        if (!senderId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sendInvitationParamsSchema.parse(req.params);

        const sqlSessionExist = `
            SELECT owner_id
            FROM sessions
            WHERE id = $1 AND owner_id = $2 AND status = 'waiting'
        `;

        const sessionOwner = await query(sqlSessionExist, [data.sessionId, senderId]);

        if (sessionOwner.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        if (senderId === data.receiverId) {
            res.status(400).json({ message: 'You cannot send a request to yourself' });
            return;
        }

        const receiverExist = await query('SELECT id FROM users WHERE id = $1', [data.receiverId]);

        if (receiverExist.rowCount === 0) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        const receiverMember = await query(
            `
                SELECT id FROM session_members
                WHERE session_id = $1 AND user_id = $2
            `,
            [data.sessionId, data.receiverId],
        );

        if ((receiverMember.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The invitation recipient is already in the session' });
            return;
        }

        const invitationExist = await query(
            `SELECT status FROM session_invitations WHERE session_id = $1 AND sender_id = $2 AND receiver_id = $3 AND status = 'pending'`,
            [data.sessionId, senderId, data.receiverId],
        );

        if ((invitationExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'You have already sent an invitation to this user' });
            return;
        }

        const sql = `
            INSERT INTO session_invitations (session_id, sender_id, receiver_id)
            VALUES ($1, $2, $3)
            RETURNING id, session_id, sender_id, receiver_id, status, created_at
        `;

        const sessionInvitation = await query(sql, [data.sessionId, senderId, data.receiverId]);

        res.status(201).json({
            sessionInvitation: sessionInvitation.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_pending_session_invitation'
        ) {
            res.status(409).json({ message: 'You cannot resend an existing invitation' });
            return;
        }

        throw error;
    }
};

export const acceptSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    let client = null;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = invitationIdSchema.parse(req.params);

        client = await pool.connect();

        await client.query('BEGIN');

        const invitation = await client.query(
            `
                SELECT id, session_id, sender_id, receiver_id
                FROM session_invitations
                WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
                FOR UPDATE
            `,
            [data.invitationId, userId],
        );

        if (invitation.rowCount === 0) {
            await client.query('ROLLBACK');

            res.status(404).json({
                message: 'Invitation not found',
            });
            return;
        }

        const sessionId = invitation.rows[0].session_id;

        const session = await client.query(
            `
                SELECT id, max_players
                FROM sessions
                WHERE id = $1 AND status = 'waiting'
                FOR UPDATE
            `,
            [sessionId],
        );

        if (session.rowCount === 0) {
            await client.query('ROLLBACK');

            res.status(404).json({
                message: 'Session not found',
            });
            return;
        }

        const currentPlayers = await client.query(
            `
                SELECT COUNT(id) AS current_players
                FROM session_members
                WHERE session_id = $1
            `,
            [sessionId],
        );

        const maxPlayers = session.rows[0].max_players;
        const currentPlayersNum = Number(currentPlayers.rows[0].current_players);

        if (currentPlayersNum >= maxPlayers) {
            await client.query('ROLLBACK');

            res.status(409).json({
                message: 'There are no available spots in the playroom',
            });
            return;
        }

        const acceptedRequest = await client.query(
            `
                UPDATE session_invitations
                SET status = 'accepted'
                WHERE id = $1
                RETURNING id, session_id, sender_id, receiver_id, status, created_at
            `,
            [data.invitationId],
        );

        const userMember = await client.query(
            `
                INSERT INTO session_members (session_id, user_id)
                VALUES ($1, $2)
                RETURNING id, session_id, user_id, role, joined_at
            `,
            [sessionId, userId],
        );

        await client.query('COMMIT');

        res.status(200).json({
            invitation: acceptedRequest.rows[0],
            userMember: userMember.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (client) {
            await client.query('ROLLBACK');
        }

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_session_member'
        ) {
            res.status(409).json({
                message: 'User is already in session',
            });
            return;
        }

        throw error;
    } finally {
        if (client) {
            client.release();
        }
    }
};

export const rejectSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = invitationIdSchema.parse(req.params);

        const sql = `
            UPDATE session_invitations SET status = 'rejected'
            WHERE receiver_id = $1 AND id = $2 AND status = 'pending'
            RETURNING id, session_id, sender_id, receiver_id, status, created_at
        `;

        const rejectedRequest = await query(sql, [userId, data.invitationId]);

        if (rejectedRequest.rowCount === 0) {
            res.status(409).json({ message: 'Failed to reject invite request in session' });
            return;
        }

        res.status(200).json({
            rejectedRequest: rejectedRequest.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const getSessionsInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const sql = `
            SELECT u.name AS sender_name, g.name AS game_name, s.title, s.created_at, s.max_players, COUNT(sm.id) AS current_players, si.id
            FROM session_invitations si
            INNER JOIN users u
                ON si.sender_id = u.id
            INNER JOIN sessions s
                ON si.session_id = s.id
            INNER JOIN games g
                ON s.game_id = g.id
            LEFT JOIN session_members sm
                ON s.id = sm.session_id
            WHERE si.receiver_id = $1 AND si.status = 'pending' AND s.status = 'waiting'
            GROUP BY si.id, u.name, g.name, s.title, s.max_players
        `;

        const userInvitations = await query(sql, [userId]);

        res.status(200).json({
            userInvitations: userInvitations.rows,
        });
    } catch (error) {
        throw error;
    }
};

export const startSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const ownerId = req.user?.userId;

    try {
        if (!ownerId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sessionIdSchema.parse(req.params);

        const startSession = await query(
            `
                UPDATE sessions SET status = 'active'
                WHERE id = $1 AND owner_id = $2 AND status = 'waiting'
                RETURNING id, status
            `,
            [data.sessionId, ownerId],
        );

        if (startSession.rowCount === 0) {
            res.status(409).json({
                message: 'Unable to start this session',
            });
            return;
        }

        res.status(200).json({
            start: startSession.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const completeSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const ownerId = req.user?.userId;

    try {
        if (!ownerId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sessionIdSchema.parse(req.params);

        const completeSession = await query(
            `
                UPDATE sessions SET status = 'completed'
                WHERE id = $1 AND owner_id = $2 AND status = 'active'
                RETURNING id, status
            `,
            [data.sessionId, ownerId],
        );

        if (completeSession.rowCount === 0) {
            res.status(409).json({
                message: 'Unable to finish this session',
            });
            return;
        }

        res.status(200).json({
            complete: completeSession.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};

export const cancelSession = async (req: AuthRequest, res: Response): Promise<void> => {
    const ownerId = req.user?.userId;

    let client = null;

    try {
        if (!ownerId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = sessionIdSchema.parse(req.params);

        client = await pool.connect();

        await client.query('BEGIN');

        const cancelSession = await client.query(
            `
                UPDATE sessions SET status = 'cancelled'
                WHERE id = $1 AND owner_id = $2 AND status IN ('waiting', 'active')
                RETURNING id, status
            `,
            [data.sessionId, ownerId],
        );

        if (cancelSession.rowCount === 0) {
            await client.query('ROLLBACK');
            res.status(409).json({
                message: 'Failed to cancel the current session',
            });
            return;
        }

        await client.query(
            `
            DELETE FROM session_members 
            WHERE session_id = $1
            RETURNING id
        `,
            [data.sessionId],
        );

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Session successfully cancelled',
            cancel: cancelSession.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (client) await client.query('ROLLBACK');

        throw error;
    } finally {
        if (client) client.release();
    }
};

export const getSessionMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = sessionIdSchema.parse(req.params);

        const messageSql = `
            SELECT m.id, m.text, m.created_at, u.name, u.avatar_url
            FROM messages m
            INNER JOIN users u
            ON m.sender_id = u.id
            WHERE m.session_id = $1
            ORDER BY m.created_at ASC
        `;

        const messages = await query(messageSql, [data.sessionId]);

        res.status(200).json({
            messages: messages.rows,
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};
