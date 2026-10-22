import { Users, Mic, MicOff, Clock } from 'lucide-react';

import type { Session } from '../types/session';

import './SessionCard.scss';

type SessionCardProps = {
    session: Session;
    onSelect: (sessionId: number) => void;
};

const SessionCard = ({ session, onSelect }: SessionCardProps) => {
    const isFull = session.current_players >= session.max_players;

    return (
        <article className="session-card">
            <div className="session-card__cover">
                {session.background_image ? (
                    <img
                        className="session-card__image"
                        src={session.background_image}
                        alt={session.game_name}
                    />
                ) : (
                    <div className="session-card__image-placeholder">
                        <span>{session.game_name}</span>
                    </div>
                )}

                <span className={`session-card__status session-card__status--${session.status}`}>
                    {session.status}
                </span>
            </div>

            <div className="session-card__body">
                <div className="session-card__game">{session.game_name}</div>

                <h2 className="session-card__title">{session.title}</h2>

                <p className="session-card__description">
                    {session.description || 'Описание не добавлено.'}
                </p>

                <div className="session-card__meta">
                    <span className="session-card__meta-item">
                        <Users size={16} aria-hidden="true" />
                        {session.current_players}/{session.max_players}
                    </span>

                    <span className="session-card__meta-item">
                        {session.mic_required ? (
                            <Mic size={16} aria-hidden="true" />
                        ) : (
                            <MicOff size={16} aria-hidden="true" />
                        )}
                        {session.mic_required ? 'Microphone required' : 'No microphone required'}
                    </span>
                </div>

                {session.starts_at && (
                    <div className="session-card__time">
                        <Clock size={16} aria-hidden="true" />
                        <span>{session.starts_at}</span>
                    </div>
                )}

                <button
                    className="session-card__action"
                    type="button"
                    disabled={isFull}
                    onClick={() => onSelect(session.id)}
                >
                    {isFull ? 'The session is full' : 'Join a session'}
                </button>
            </div>
        </article>
    );
};

export default SessionCard;
