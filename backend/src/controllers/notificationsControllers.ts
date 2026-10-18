import type { Request, Response, NextFunction } from 'express';
import { query } from '../config/bd.js';
import { errorZod } from '../utils/errorZod.js';
import { querySchema, notificationId } from '../schema/notifications.schema.js';

export const getNotifications = async (
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

        const { page, limit } = querySchema.parse(req.query);
        const offset = (page - 1) * limit;

        const notifications = await query(
            `
                SELECT n.id, n.actor_id, n.user_id, n.type, n.session_id, n.friendship_id, n.read_at, n.created_at, u.name, u.avatar_url
                FROM notifications n
                LEFT JOIN users u
                ON n.actor_id = u.id
                WHERE n.user_id = $1
                ORDER BY n.created_at DESC, n.id DESC
                LIMIT $2
                OFFSET $3
            `,
            [userId, limit, offset],
        );

        res.status(200).json({
            notifications: notifications.rows,
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        next(error);
    }
};

export const notificationRead = async (
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

        const data = notificationId.parse(req.params);

        const notificationRead = await query(
            `
                UPDATE notifications
                SET read_at = COALESCE(read_at, NOW())
                WHERE user_id = $1 AND id = $2
                RETURNING read_at
            `,
            [userId, data.notificationId],
        );

        if (notificationRead.rowCount === 0) {
            res.status(404).json({
                message: 'Notification not found',
            });
            return;
        }

        res.status(200).json({
            notification: notificationRead.rows[0],
        });
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        next(error);
    }
};

export const allNotificationsRead = async (
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

        const allNotificationRead = await query(
            `
                UPDATE notifications SET read_at = NOW()
                WHERE user_id = $1 AND read_at IS NULL
                RETURNING id, type, read_at
            `,
            [userId],
        );

        res.status(200).json({
            notifications: allNotificationRead.rows,
        });
    } catch (error) {
        next(error);
    }
};
