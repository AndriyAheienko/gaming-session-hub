type MemberType = 'owner' | 'member';

export type NotificationType =
    | 'friend_request'
    | 'friend_accepted'
    | 'session_invite'
    | 'session_joined'
    | 'session_left'
    | 'session_started'
    | 'session_cancelled'
    | 'new_rating';

export interface SessionMemberResult {
    session_id: number;
    user_id: number;
    role: MemberType;
    joined_at: Date;
}

export interface NotificationResult {
    id: number;
    actor_id: number | null;
    user_id: number;
    type: NotificationType;
    session_id: number | null;
    friendship_id: number | null;
    read_at: null;
    created_at: Date;
    name: string;
    avatar_url: string;
}

export interface CreateNotificationParams {
    actorId: number;
    userId: number;
    type: NotificationType;
    sessionId?: number;
    friendshipId?: number;
}
