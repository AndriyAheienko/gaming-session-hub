import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import { getSessions } from '../features/sessions/services/sessionApi';
import type { Session, SessionLanguage, SessionSort } from '../features/sessions/types/session';
import { useDebounce } from '../hooks/useDebounce';
import { useOutsideClick } from '../hooks/useOutsideClick';
import SessionCard from '../features/sessions/components/SessionCard';

import '../styles/pages/_home-page.scss';

interface Sort {
    id: number;
    title: string;
    sort: SessionSort;
}

interface Language {
    id: number;
    title: string;
    lang: SessionLanguage | undefined;
}

const sorts: Sort[] = [
    { id: 1, title: 'Newest', sort: 'newest' },
    { id: 2, title: 'Oldest', sort: 'oldest' },
    { id: 3, title: 'Soonest', sort: 'soonest' },
    { id: 4, title: 'Latest', sort: 'latest' },
    { id: 5, title: 'Least free', sort: 'least-free' },
    { id: 6, title: 'Most free', sort: 'most-free' },
];

const languages: Language[] = [
    { id: 1, title: 'All languages', lang: undefined },
    { id: 2, title: 'English', lang: 'eng' },
    { id: 3, title: 'Ukrainian', lang: 'ua' },
];

const HomePage = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [loader, setLoader] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [btnLoader, setBtnLoader] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const [sortBy, setSortBy] = useState<SessionSort>('newest');
    const [isSortOpen, setIsSortOpen] = useState(false);

    const [available, setAvailable] = useState(false);

    const [isLangOpen, setIsLangOpen] = useState(false);
    const [language, setLanguage] = useState<SessionLanguage | undefined>(undefined);

    const langRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    const debounceSearchTerm = useDebounce(search, 500);

    const closeSort = useCallback(() => {
        setIsSortOpen(false);
    }, []);

    useOutsideClick(sortRef, closeSort);

    const closeLang = useCallback(() => {
        setIsLangOpen(false);
    }, []);

    useOutsideClick(langRef, closeLang);

    useEffect(() => {
        if (search !== debounceSearchTerm) {
            return;
        }

        const controller = new AbortController();

        const getAllSessions = async () => {
            setError('');

            if (page === 1) {
                setLoader(true);
                setSessions([]);
            } else {
                setBtnLoader(true);
            }

            try {
                const result = await getSessions(
                    {
                        page,
                        limit: 10,
                        sort: sortBy,
                        search: debounceSearchTerm,
                        available,
                        language,
                    },
                    { signal: controller.signal },
                );

                setHasMore(result.hasMore);

                if (page === 1) {
                    setSessions(result.sessions);
                } else {
                    setSessions(prev => {
                        const newSessions = result.sessions.filter(
                            newSession =>
                                !prev.some(prevSession => prevSession.id === newSession.id),
                        );

                        return [...prev, ...newSessions];
                    });
                }
            } catch (err) {
                if (controller.signal.aborted || axios.isCancel(err)) {
                    return;
                }

                if (axios.isAxiosError(err)) {
                    const message =
                        err.response?.data?.message || 'Error retrieving the list of sessions';

                    setError(message);
                } else {
                    setError('An unexpected error occurred');
                    console.error('Error unknown:', err);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoader(false);
                    setBtnLoader(false);
                }
            }
        };

        getAllSessions();

        return () => controller.abort();
    }, [debounceSearchTerm, sortBy, available, language, page, search, retryCount]);

    const navigate = useNavigate();

    return (
        <section className="home-page">
            <header className="home-page__header">
                <div className="home-page__heading">
                    <span className="home-page__eyebrow">FIND YOUR TEAM</span>
                    <h1 className="home-page__title">Gaming sessions</h1>
                    <p className="home-page__description">
                        Find players, join a session and enjoy your favorite games together.
                    </p>
                </div>

                <button
                    className="home-page__create-button"
                    type="button"
                    onClick={() => navigate('/sessionCreate')}
                >
                    Create session
                </button>
            </header>
            <section className="session-filters" aria-label="Session search and filters">
                <form
                    className="session-filters__search"
                    role="search"
                    onSubmit={e => e.preventDefault()}
                >
                    <label className="session-filters__label" htmlFor="session-search">
                        Search sessions
                    </label>
                    <input
                        className="session-filters__search-input"
                        id="session-search"
                        type="search"
                        placeholder="Search by game or session..."
                        value={search}
                        onChange={e => {
                            setPage(1);
                            setLoader(false);
                            setBtnLoader(false);
                            setSearch(e.target.value);
                        }}
                    />
                </form>
                <fieldset className="session-filters__options">
                    <legend className="session-filters__legend">Filters</legend>
                    <div className="session-filters__dropdown" ref={sortRef}>
                        <span className="session-filters__label">Sort by</span>
                        <button
                            className="session-filters__dropdown-trigger"
                            type="button"
                            aria-expanded={isSortOpen}
                            aria-haspopup="true"
                            onClick={() => setIsSortOpen(prev => !prev)}
                        >
                            <span>{sorts.find(s => s.sort === sortBy)?.title}</span>
                            {isSortOpen ? <ArrowUp /> : <ArrowDown />}
                        </button>
                        {isSortOpen && (
                            <ul className="session-filters__dropdown-menu">
                                {sorts.map(sort => (
                                    <li key={sort.id}>
                                        <button
                                            className={`session-filters__dropdown-option ${
                                                sortBy === sort.sort
                                                    ? 'session-filters__dropdown-option--active'
                                                    : ''
                                            }`}
                                            type="button"
                                            onClick={() => {
                                                setSortBy(sort.sort);
                                                setPage(1);
                                                setIsSortOpen(false);
                                            }}
                                        >
                                            {sort.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="session-filters__dropdown" ref={langRef}>
                        <span className="session-filters__label">Language</span>
                        <button
                            className="session-filters__dropdown-trigger"
                            type="button"
                            aria-expanded={isLangOpen}
                            aria-haspopup="true"
                            onClick={() => setIsLangOpen(prev => !prev)}
                        >
                            <span>{languages.find(l => l.lang === language)?.title}</span>
                            {isLangOpen ? <ArrowUp /> : <ArrowDown />}
                        </button>
                        {isLangOpen && (
                            <ul className="session-filters__dropdown-menu">
                                {languages.map(lang => (
                                    <li key={lang.id}>
                                        <button
                                            className={`session-filters__dropdown-option ${
                                                language === lang.lang
                                                    ? 'session-filters__dropdown-option--active'
                                                    : ''
                                            }`}
                                            type="button"
                                            onClick={() => {
                                                setLanguage(lang.lang);
                                                setPage(1);
                                                setIsLangOpen(false);
                                            }}
                                        >
                                            {lang.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <label className="session-filters__checkbox">
                        <input
                            className="session-filters__checkbox-input"
                            type="checkbox"
                            checked={available}
                            onChange={() => {
                                setPage(1);
                                setAvailable(prev => !prev);
                            }}
                        />
                        <span className="session-filters__checkbox-control" aria-hidden="true" />
                        <span className="session-filters__checkbox-text">
                            Only available sessions
                        </span>
                    </label>
                </fieldset>
            </section>
            <section className="session-results" aria-label="Available gaming sessions">
                <div className="session-results__header">
                    <h2 className="session-results__title">Sessions</h2>
                    <span className="session-results__count">{sessions.length} found</span>
                </div>
                {error && (
                    <p
                        className="session-results__message session-results__message--error"
                        role="alert"
                    >
                        {error}
                    </p>
                )}
                {loader && sessions.length === 0 && (
                    <p className="session-results__message" role="status">
                        Loading sessions...
                    </p>
                )}
                {sessions.length === 0 && !loader && !error && (
                    <p className="session-results__message">
                        No sessions found. Try changing your search or filters.
                    </p>
                )}
                {sessions.length > 0 && (
                    <ul className="session-results__list">
                        {sessions.map(session => (
                            <li className="session-results__item" key={session.id}>
                                <SessionCard session={session} />
                            </li>
                        ))}
                    </ul>
                )}
                {error && (
                    <button
                        className="session-results__retry-button"
                        type="button"
                        onClick={() => setRetryCount(prev => prev + 1)}
                        disabled={loader || btnLoader}
                    >
                        Try again
                    </button>
                )}
                {hasMore && !error && (
                    <button
                        className="session-results__more-button"
                        type="button"
                        onClick={() => setPage(prev => prev + 1)}
                        disabled={btnLoader || loader}
                    >
                        {btnLoader ? 'Loading...' : 'Show more sessions'}
                    </button>
                )}
            </section>
        </section>
    );
};

export default HomePage;
