import type { Request, Response, NextFunction } from 'express';
import type { PoolClient } from 'pg';

import { errorZod } from '../utils/errorZod.js';
import pool, { query } from '../config/bd.js';
import { isPostgresError } from '../utils/isPostgresError.js';
import { receiverSchema, friendshipSchema } from '../schema/friendships.schema.js';
import { errorTransaction } from '../utils/errorTransaction.js';
import { createSingleNotification } from '../services/sessionService.js';

export const sendFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const senderId = req.user?.userId;

    let client: PoolClient | null = null;

    try {
        if (!senderId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const { receiverId } = receiverSchema.parse(req.params);

        const receiverExist = await query('SELECT id FROM users WHERE id = $1', [receiverId]);

        if (receiverExist.rowCount === 0) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        if (senderId === receiverId) {
            res.status(400).json({ message: 'You cannot send a request to yourself' });
            return;
        }

        client = await pool.connect();

        await client.query('BEGIN');

        const friendshipExist = await client.query(
            `
            SELECT id FROM friendships
            WHERE (
                (sender_id = $1 AND receiver_id = $2)
                OR
                (receiver_id = $1 AND sender_id = $2)
            )
            AND status IN ('pending', 'accepted')`,
            [senderId, receiverId],
        );

        if ((friendshipExist.rowCount ?? 0) > 0) {
            await errorTransaction(client);
            res.status(409).json({ message: 'A friendship already exists between the users' });
            return;
        }

        const friendship = await client.query(
            'INSERT INTO friendships (sender_id, receiver_id) VALUES ($1, $2) RETURNING id, sender_id, receiver_id, status, created_at',
            [senderId, receiverId],
        );

        const notification = await createSingleNotification(client, {
            actorId: senderId,
            userId: receiverId,
            type: 'friend_request',
            friendshipId: friendship.rows[0].id,
        });

        await client.query('COMMIT');

        req.io.to(`user_${receiverId}`).emit('new_notification', notification);

        res.status(201).json({
            friendship: friendship.rows[0],
            notifications: notification,
        });
    } catch (error) {
        await errorTransaction(client);

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

        next(error);
    } finally {
        if (client) client.release();
    }
};

export const acceptFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const userId = req.user?.userId;

    let client: PoolClient | null = null;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const { friendshipId } = friendshipSchema.parse(req.params);

        client = await pool.connect();
        await client.query('BEGIN');

        const sql = `
            UPDATE friendships SET status = 'accepted'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at 
        `;

        const acceptRequest = await client.query(sql, [friendshipId, userId]);

        if (acceptRequest.rowCount === 0) {
            await errorTransaction(client);
            res.status(400).json({ message: 'Failed to accept the friend request' });
            return;
        }

        const notification = await createSingleNotification(client, {
            actorId: userId,
            userId: acceptRequest.rows[0].sender_id,
            type: 'friend_accepted',
            friendshipId: friendshipId,
        });

        await client.query('COMMIT');

        req.io.to(`user_${acceptRequest.rows[0].sender_id}`).emit('new_notification', notification);

        res.status(200).json({
            acceptRequest: acceptRequest.rows[0],
            notifications: notification,
        });
    } catch (error) {
        await errorTransaction(client);

        if (errorZod(res, error)) {
            return;
        }

        next(error);
    } finally {
        if (client) client.release();
    }
};

export const rejectFriendRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const { friendshipId } = friendshipSchema.parse(req.params);

        const sql = `
            UPDATE friendships SET status = 'rejected'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at  
        `;

        const rejectRequest = await query(sql, [friendshipId, userId]);

        if (rejectRequest.rowCount === 0) {
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

        next(error);
    }
};

export const getUserFriends = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
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
        next(error);
    }
};

export const deleteUserFriend = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const userId = req.user?.userId;

    try {
        if (!userId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const { friendshipId } = friendshipSchema.parse(req.params);

        const deleteFriend = await query(
            `
                UPDATE friendships SET status = 'deleted'
                WHERE id = $1 AND status = 'accepted' AND (sender_id = $2 OR receiver_id = $2)
                RETURNING id, sender_id, receiver_id, status, created_at
            `,
            [friendshipId, userId],
        );

        if (deleteFriend.rowCount === 0) {
            res.status(400).json({ message: 'Failed to deleted the friend' });
            return;
        }

        res.status(200).json({
            message: 'The user has been successfully removed from your friends list',
            deleteFriend: deleteFriend.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        next(error);
    }
};
