export type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type SessionLanguage = 'eng' | 'ua';
export type SessionSort = 'newest' | 'oldest' | 'soonest' | 'latest' | 'least-free' | 'most-free';

export interface GetSessionPayload {
    page: number;
    limit: number;
    sort: SessionSort;
    search: string;
    available: boolean;
    language?: SessionLanguage;
}

export interface Session {
    id: number;
    title: string;
    max_players: number;
    status: SessionStatus;
    starts_at: string;
    language: SessionLanguage;
    mic_required: boolean;
    created_at: string;
    description: string | null;
    game_name: string;
    background_image: string | null;
    owner_id: number | null;
    owner_name: string | null;
    current_players: number;
}

export interface GetSessionsResponse {
    sessions: Session[];
    hasMore: boolean;
}

export interface CreateSessionPayload {
    title: string;
    maxPlayers: number;
    startsAt: string;
    language: SessionLanguage;
    micRequired: boolean;
    description: string;
    rawg_id: number;
}

export interface CreatedSession {
    id: number;
    title: string;
    game_id: number;
    max_players: number;
    starts_at: string;
    language: SessionLanguage;
    mic_required: boolean;
    description: string | null;
    owner_id: number;
    status: SessionStatus;
    created_at: string;
}

export interface SessionMember {
    id: number;
    session_id: number;
    user_id: number;
    role: 'owner' | 'member';
    joined_at: string;
}

export interface CreateSessionResponse {
    session: CreatedSession;
    member: SessionMember;
}
