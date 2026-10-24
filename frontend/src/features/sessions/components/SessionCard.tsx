import { Users, Mic, MicOff, Clock, Globe, User } from 'lucide-react';
import type { Session, SessionStatus, SessionLanguage } from '../types/session';
import { formatSessionDate } from '../../../utils/formatDate';
import './SessionCard.scss';

type SessionCardProps = {
    session: Session;
    // onSelect: (sessionId: number) => void;
};

const statusLabels: Record<SessionStatus, string> = {
    waiting: 'Waiting for players',
    active: 'In progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const languageLabels: Record<SessionLanguage, string> = {
    eng: 'English',
    ua: 'Ukrainian',
};

const SessionCard = ({ session }: SessionCardProps) => {
    const currentPlayers = Number(session.current_players);
    const isFull = currentPlayers >= session.max_players;

    return (
        <article className="session-card">
            <div className="session-card__cover">
                {session.background_image ? (
                    <img
                        className="session-card__image"
                        src={session.background_image}
                        alt={session.game_name}
                        loading="lazy"
                    />
                ) : (
                    <div className="session-card__image-placeholder">
                        <span>{session.game_name}</span>
                    </div>
                )}

                <span className={`session-card__status session-card__status--${session.status}`}>
                    {statusLabels[session.status]}
                </span>
            </div>

            <div className="session-card__body">
                <div className="session-card__game">{session.game_name}</div>

                <h2 className="session-card__title">{session.title}</h2>

                <p className="session-card__description">
                    {session.description || 'No description added'}
                </p>

                <div className="session-card__meta">
                    <span className="session-card__meta-item">
                        <Users size={16} aria-hidden="true" />
                        {currentPlayers}/{session.max_players}
                    </span>

                    <span
                        className="session-card__meta-item"
                        title={
                            session.mic_required ? 'Microphone required' : 'No microphone required'
                        }
                    >
                        {session.mic_required ? (
                            <Mic size={16} aria-hidden="true" />
                        ) : (
                            <MicOff size={16} aria-hidden="true" />
                        )}
                    </span>

                    <span className="session-card__meta-item">
                        <Globe size={16} aria-hidden="true" />
                        {languageLabels[session.language]}
                    </span>
                </div>

                <div className="session-card__footer-info">
                    <div className="session-card__time">
                        <Clock size={16} aria-hidden="true" />
                        <span>{formatSessionDate(session.starts_at)}</span>
                    </div>
                    <div className="session-card__host">
                        <User size={16} aria-hidden="true" />
                        <span>{session.owner_name}</span>
                    </div>
                </div>

                <button
                    className="session-card__action"
                    type="button"
                    disabled={isFull}
                    // onClick={() => onSelect(session.id)}
                >
                    {isFull ? 'The session is full' : 'Join a session'}
                </button>
            </div>
        </article>
    );
};

export default SessionCard;
