type Status = 'waiting' | 'active' | 'completed' | 'cancelled';
type Language = 'eng' | 'ua';

export interface Session {
    id: number;
    title: string;
    max_players: number;
    status: Status;
    starts_at: string;
    language: Language;
    mic_required: boolean;
    created_at: string;
    description: string;
    game_name: string;
    background_image: string;
    owner_id: number;
    owner_name: string;
    current_players: number;
}
