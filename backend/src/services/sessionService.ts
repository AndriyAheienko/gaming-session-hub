import type { PoolClient } from 'pg';
import type {
    SessionMemberResult,
    NotificationResult,
    NotificationType,
} from '../types/sessionService.types.js';

export const notifySessionMembers = async (
    client: PoolClient,
    sessionId: number,
    memberId: number,
    type: NotificationType,
) => {
    const membersNotifications = await client.query<NotificationResult>(
        `
            INSERT INTO notifications (actor_id, user_id, session_id, type)
            SELECT $1, user_id, $2, $3
            FROM session_members sm
            WHERE sm.session_id = $2 AND sm.user_id != $1
            RETURNING id, actor_id, type, created_at
        `,
        [memberId, sessionId, type],
    );

    return {
        membersNotifications: membersNotifications.rows,
    };
};

export const addMemberandNotify = async (
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
