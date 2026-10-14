import type { PoolClient } from 'pg';
import type {
    SessionMemberResult,
    NotificationResult,
    NotificationType,
    CreateNotificationParams,
} from '../types/sessionService.types.js';

export const createSingleNotification = async (
    client: PoolClient,
    data: CreateNotificationParams,
): Promise<NotificationResult> => {
    const sql = `
            WITH inserted_notification AS (
                INSERT INTO notifications (actor_id, user_id, type, session_id, friendship_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, actor_id, user_id, type, session_id, friendship_id, read_at, created_at
            )
            SELECT i.id, i.actor_id, i.user_id, i.type, i.session_id, i.friendship_id, i.read_at, i.created_at, u.name, u.avatar_url
            FROM inserted_notification i
            LEFT JOIN users u
            ON i.actor_id = u.id
        `;

    const result = await client.query(sql, [
        data.actorId,
        data.userId,
        data.type,
        data.sessionId ?? null,
        data.friendshipId ?? null,
    ]);

    return result.rows[0];
};

export const notifySessionMembers = async (
    client: PoolClient,
    sessionId: number,
    memberId: number,
    type: NotificationType,
) => {
    const membersNotifications = await client.query<NotificationResult>(
        `
            WITH inserted_notification AS (
                INSERT INTO notifications (actor_id, user_id, session_id, type)
                SELECT $1, user_id, $2, $3
                FROM session_members sm
                WHERE sm.session_id = $2 AND sm.user_id != $1
                RETURNING id, actor_id, user_id, type, session_id, friendship_id, read_at, created_at
            )
            SELECT i.id, i.actor_id, i.user_id, i.type, i.session_id, i.friendship_id, i.read_at, i.created_at, u.name, u.avatar_url
            FROM inserted_notification i
            LEFT JOIN users u
            ON i.actor_id = u.id
        `,
        [memberId, sessionId, type],
    );

    return {
        membersNotifications: membersNotifications.rows,
    };
};

export const addMemberAndNotify = async (
    client: PoolClient,
    sessionId: number,
    memberId: number,
) => {
    const sql = `
            INSERT INTO session_members (session_id , user_id)
            VALUES ($1, $2)
            RETURNING session_id, user_id, role, joined_at 
        `;

    const sessionMember = await client.query<SessionMemberResult>(sql, [sessionId, memberId]);

    const { membersNotifications } = await notifySessionMembers(
        client,
        sessionId,
        memberId,
        'session_joined',
    );

    return {
        sessionMember: sessionMember.rows[0],
        membersNotifications,
    };
};
