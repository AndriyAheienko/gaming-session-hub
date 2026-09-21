import type { Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import { errorHandler } from '../utils/errorHandler.js';
import { query } from '../config/bd.js';

export const sendFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const sender_id = req.user?.userId;
    const receiver_id = Number(req.params.userId);

    try {
        const receiverExist = await query('SELECT id FROM users WHERE id = $1', [receiver_id]);

        if (receiverExist.rowCount === 0) {
            res.status(404).json({ message: 'Receiver not found' });
            return;
        }

        if (sender_id === receiver_id) {
            res.status(400).json({ message: 'You cannot send a request to yourself' });
            return;
        }

        const friendshipExist = await query(
            'SELECT id FROM friendships WHERE (sender_id = $1 AND receiver_id = $2) OR (receiver_id = $1 AND sender_id = $2)',
            [sender_id, receiver_id],
        );

        if ((friendshipExist.rowCount ?? 0) > 0) {
            res.status(409).json({ message: 'A friendship already exists between the users' });
            return;
        }

        const friendship = await query(
            'INSERT INTO friendships (sender_id, receiver_id) VALUES ($1, $2) RETURNING id, sender_id, receiver_id, status, created_at',
            [sender_id, receiver_id],
        );

        res.status(201).json({
            friendship: friendship.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error while attempting to send a friend request', error);
    }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const friendshipId = Number(req.params.friendshipId);

    try {
        const sql = `
            UPDATE friendships SET status = 'accepted'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at 
        `;

        const acceptRequest = await query(sql, [friendshipId, userId]);

        if (acceptRequest.rows.length === 0) {
            res.status(400).json({ message: 'Failed to accept the friend request' });
            return;
        }

        res.status(200).json({
            acceptRequest: acceptRequest.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error cannot accept friendship request', error);
    }
};

export const rejectFriendRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    const friendshipId = Number(req.params.friendshipId);

    try {
        const sql = `
            UPDATE friendships SET status = 'rejected'
            WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
            RETURNING id, sender_id, receiver_id, status, created_at  
        `;

        const rejectRequest = await query(sql, [friendshipId, userId]);

        if (rejectRequest.rows.length === 0) {
            res.status(400).json({ message: 'Failed to reject the friend request' });
            return;
        }

        res.status(200).json({
            rejectRequest: rejectRequest.rows[0],
        });
    } catch (error) {
        errorHandler(res, 'Error cannot reject friendship request', error);
    }
};
