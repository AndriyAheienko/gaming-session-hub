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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const lang = req.query.lang as string | undefined;
    const sort = req.query.sort as string | undefined;

    const offset = (page - 1) * limit;

    try {
        let baseQuery = `
            FROM sessions s
            INNER JOIN games g
            ON s.game_id = g.id
            INNER JOIN users u
            ON s.owner_id = u.id
            INNER JOIN session_members sm
            ON s.id = sm.session_id
            WHERE 1=1
        `;
        const values: (string | number)[] = [];
        let paramIndex = 1;

        if (search) {
            values.push(`%${search}%`);
            baseQuery += ` AND (s.title ILIKE $${paramIndex} OR g.name ILIKE $${paramIndex})`;
            paramIndex++;
        }

        if (lang) {
            values.push(lang);
            baseQuery += ` AND s.language = $${paramIndex}`;
            paramIndex++;
        }

        let orderQuery = '';
        switch (sort) {
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

        mainValues.push(limit);
        const limitIndex = paramIndex;
        paramIndex++;

        mainValues.push(offset);
        const offsetIndex = paramIndex;

        const sql = `
            SELECT s.id, s.title, s.max_players, s.starts_at, s.language, s.mic_required, s.created_at, g.name AS game_name, u.id AS owner_id, u.name AS owner_name, COUNT(sm.id) AS current_players
            ${baseQuery}
            GROUP BY s.id
            ${orderQuery}
            LIMIT $${limitIndex}
            OFFSET $${offsetIndex}

        `;

        const sessions = await query(sql, mainValues);

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
            SELECT COUNT(user_id) AS current_players
            FROM session_members
            WHERE session_id = $1
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

export const sendSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const senderId = req.user?.userId;
    const receiver_id = Number(req.params.userId);
    const sessionId = Number(req.params.sessionId);

    try {
        const sqlSessionExist = `
            SELECT owner_id
            FROM sessions
            WHERE id = $1 AND owner_id = $2
        `;

        const ownerSessionExist = await query(sqlSessionExist, [sessionId, senderId]);

        if (ownerSessionExist.rowCount === 0) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        if (ownerSessionExist.rows[0].owner_id === receiver_id) {
            res.status(400).json({ message: 'You cannot send a request to yourself' });
            return;
        }

        const receiverExist = await query('SELECT id FROM users WHERE id = $1', [receiver_id]);

        if (receiverExist.rowCount === 0) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        const receiverMember = await query(
            `
            SELECT id FROM session_members
            WHERE session_id = $1 AND user_id = $2
            `,
            [sessionId, receiver_id],
        );

        if ((receiverMember.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'The invitation recipient is already in the session' });
            return;
        }

        const invitationExist = await query(
            `SELECT status FROM session_invitations WHERE session_id = $1 AND sender_id = $2 AND receiver_id = $3 AND status = 'pending'`,
            [sessionId, senderId, receiver_id],
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

        const sessionInvitation = await query(sql, [sessionId, senderId, receiver_id]);

        res.status(201).json({
            sessionInvitation: sessionInvitation.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Failed to session invitation', error);
    }
};

export const acceptSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const invitationId = Number(req.params.invitationId);

    const client = await pool.connect();

    try {
        const session = await query('SELECT session_id FROM session_invitations WHERE id = $1', [
            invitationId,
        ]);

        if (session.rowCount === 0) {
            res.status(404).json({ message: 'Invitation not found' });
            return;
        }

        const sessionId = session.rows[0].session_id;

        const userExist = await query(
            'SELECT id FROM session_members WHERE session_id = $1 AND user_id = $2',
            [sessionId, userId],
        );

        if ((userExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'User is already in session' });
            return;
        }

        const sessionMaxPlayers = await query('SELECT max_players FROM sessions WHERE id = $1', [
            sessionId,
        ]);

        const currentPlayers = await query(
            'SELECT COUNT(id) AS current_players FROM session_members WHERE session_id = $1',
            [sessionId],
        );

        const maxPlayers = sessionMaxPlayers.rows[0].max_players;
        const currentPlayersNum = Number(currentPlayers.rows[0].current_players);

        if (currentPlayersNum >= maxPlayers) {
            res.status(409).json({ message: 'There are no available spots in the playroom' });
            return;
        }

        await client.query('BEGIN');

        const sql = `
            UPDATE session_invitations SET status = 'accepted'
            WHERE receiver_id = $1 AND id = $2 AND status = 'pending'
            RETURNING id, session_id, sender_id, receiver_id, status, created_at
        `;

        const acceptedRequest = await client.query(sql, [userId, invitationId]);

        if (acceptedRequest.rowCount === 0) {
            res.status(409).json({ message: 'Failed to accept invite request in session' });
            await client.query('ROLLBACK');
            return;
        }

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
            userMember: userMember.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');

        errorHandler(res, 'Error to accept invite request in session', error);
    } finally {
        client.release();
    }
};

export const rejectSessionInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const invitationId = Number(req.params.invitationId);

    try {
        const sql = `
            UPDATE session_invitations SET status = 'rejected'
            WHERE receiver_id = $1 AND id = $2 AND status = 'pending'
            RETURNING id, session_id, sender_id, receiver_id, status, created_at
        `;

        const rejectedRequest = await query(sql, [userId, invitationId]);

        if (rejectedRequest.rowCount === 0) {
            res.status(409).json({ message: 'Failed to reject invite request in session' });
            return;
        }

        res.status(200).json({
            rejectedRequest: rejectedRequest.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error to reject invite request in session', error);
    }
};

export const getSessionsInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        const sql = `
            SELECT u.name AS sender_name, g.name AS game_name, s.title, s.created_at, s.max_players, COUNT(sm.id) AS current_players
            FROM session_invitations si
            INNER JOIN users u
            ON si.sender_id = u.id
            INNER JOIN sessions s
            ON si.session_id = s.id
            INNER JOIN games g
            ON s.game_id = g.id
            INNER JOIN session_members sm
            ON s.id = sm.session_id
            WHERE si.receiver_id = $1
            GROUP BY si.id
        `;

        const userInvitations = await query(sql, [userId]);

        res.status(200).json({
            userInvitations: userInvitations.rows,
        });
    } catch (error) {
        errorHandler(res, 'Error to get sessions invitations', error);
    }
};
