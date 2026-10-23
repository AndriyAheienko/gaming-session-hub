import { Search, SlidersHorizontal } from 'lucide-react';

import type { Session, SessionLanguage, SessionStatus } from '../types/session';
import SessionCard from './SessionCard';

import './SessionsPageView.scss';

type SessionsPageViewProps = {
    sessions: Session[];
    searchValue: string;
    statusFilter: SessionStatus | 'all';
    languageFilter: SessionLanguage | 'all';
    isLoading: boolean;
    error: string | null;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: SessionStatus | 'all') => void;
    onLanguageChange: (value: SessionLanguage | 'all') => void;
    onSelectSession: (sessionId: number) => void;
};

const SessionsPageView = ({
    sessions,
    searchValue,
    statusFilter,
    languageFilter,
    isLoading,
    error,
    onSearchChange,
    onStatusChange,
    onLanguageChange,
    onSelectSession,
}: SessionsPageViewProps) => {
    return (
        <section className="sessions-page">
            <header className="sessions-page__header">
                <div className="sessions-page__heading">
                    <span className="sessions-page__eyebrow">FIND YOUR NEXT PARTY</span>
                    <h1 className="sessions-page__title">Gaming Sessions</h1>
                    <p className="sessions-page__subtitle">
                        Find players, build your team, and jump into the game.
                    </p>
                </div>
            </header>

            <div className="sessions-page__toolbar">
                <label className="sessions-page__search">
                    <Search size={19} aria-hidden="true" />

                    <input
                        type="search"
                        value={searchValue}
                        onChange={event => onSearchChange(event.target.value)}
                        placeholder="Search games or sessions..."
                        aria-label="Search games or sessions"
                    />
                </label>

                <div className="sessions-page__filters">
                    <div className="sessions-page__filter">
                        <SlidersHorizontal size={17} aria-hidden="true" />

                        <select
                            value={statusFilter}
                            onChange={event =>
                                onStatusChange(event.target.value as SessionStatus | 'all')
                            }
                            aria-label="Filter by status"
                        >
                            <option value="all">All statuses</option>
                            <option value="waiting">Waiting for players</option>
                            <option value="active">In progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="sessions-page__filter">
                        <select
                            value={languageFilter}
                            onChange={event =>
                                onLanguageChange(event.target.value as SessionLanguage | 'all')
                            }
                            aria-label="Filter by language"
                        >
                            <option value="all">All languages</option>
                            <option value="eng">English</option>
                            <option value="ua">Ukrainian</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="sessions-page__results">
                <h2 className="sessions-page__section-title">Explore sessions</h2>

                <span className="sessions-page__count">
                    {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
                </span>
            </div>

            {isLoading ? (
                <div className="sessions-page__message" role="status">
                    Loading sessions...
                </div>
            ) : error ? (
                <div className="sessions-page__message sessions-page__message--error" role="alert">
                    {error}
                </div>
            ) : sessions.length === 0 ? (
                <div className="sessions-page__empty">
                    <h3>No sessions found</h3>
                    <p>Try changing your search or filters to find a gaming party.</p>
                </div>
            ) : (
                <div className="sessions-page__grid">
                    {sessions.map(session => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            onSelect={onSelectSession}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default SessionsPageView;
