import type { Response } from 'express';

import type { AuthRequest } from '../types/express.types.js';
import { errorHandler, errorZod } from '../utils/errorHandler.js';
import { query } from '../config/bd.js';
import { isPostgresError } from '../utils/isPostgresError.js';
import { receiverSchema, friendshipSchema } from '../schema/friendships.schema.js';

export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const senderId = req.user?.userId;

    try {
        if (!senderId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = receiverSchema.parse(req.params);

        const receiverExist = await query('SELECT id FROM users WHERE id = $1', [data.receiverId]);

        if (receiverExist.rowCount === 0) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        if (senderId === data.receiverId) {
            res.status(400).json({ message: 'You cannot send a request to yourself' });
            return;
        }

        const friendshipExist = await query(
            'SELECT id FROM friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (receiver_id = $1 AND sender_id = $2)',
            [senderId, data.receiverId],
        );

        if ((friendshipExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'A friendship already exists between the users' });
            return;
        }

        const friendship = await query(
            'INSERT INTO friendships (sender_id, receiver_id) VALUES ($1, $2) RETURNING id, sender_id, receiver_id, status, created_at',
            [senderId, data.receiverId],
        );

        res.status(201).json({
            friendship: friendship.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        if (
            isPostgresError(error) &&
            error.code === '23505' &&
            error.constraint === 'unique_friendships_between_users'
        ) {
            res.status(409).json({ message: 'A friendship already exists between the users' });
            return;
        }

        errorHandler(res, 'Error while attempting to send a friend request', error);
    }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = friendshipSchema.parse(req.params);

        const sql = `
            UPDATE friendships SET status = 'accepted'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at 
        `;

        const acceptRequest = await query(sql, [data.friendshipId, userId]);

        if (acceptRequest.rows.length === 0) {
            res.status(400).json({ message: 'Failed to accept the friend request' });
            return;
        }

        res.status(200).json({
            acceptRequest: acceptRequest.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        errorHandler(res, 'Error cannot accept friendship request', error);
    }
};

export const rejectFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const data = friendshipSchema.parse(req.params);

        const sql = `
            DELETE FROM friendships
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at  
        `;

        const rejectRequest = await query(sql, [data.friendshipId, userId]);

        if (rejectRequest.rows.length === 0) {
            res.status(400).json({ message: 'Failed to reject the friend request' });
            return;
        }

        res.status(200).json({
            rejectRequest: rejectRequest.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        errorHandler(res, 'Error cannot reject friendship request', error);
    }
};

export const getUserFriends = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const friends = await query(
            `
            SELECT u.id, u.name, u.rating_sum, u.avatar_url
            FROM friendships f
            INNER JOIN users u
                ON (f.sender_id = $1 AND u.id = f.receiver_id)
                OR (f.receiver_id = $1 AND u.id = f.sender_id)
            WHERE f.status = 'accepted'
            `,
            [userId],
        );

        res.status(200).json({
            friends: friends.rows,
        });
    } catch (error) {
        errorHandler(res, 'Error to get user list friend', error);
    }
};
