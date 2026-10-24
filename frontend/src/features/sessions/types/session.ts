export type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export type SessionLanguage = 'eng' | 'ua';
export type SessionSort = 'newest' | 'oldest' | 'soonest' | 'latest' | 'least-free' | 'most-free';

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
}
