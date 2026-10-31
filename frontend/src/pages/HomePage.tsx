import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessions } from '../features/sessions/services/sessionApi';
import type { Session, SessionLanguage } from '../features/sessions/types/session';
import { useDebounce } from '../hooks/useDebounce';
import SessionCard from '../features/sessions/components/SessionCard';
import axios from 'axios';
import type { SessionSort } from '../features/sessions/types/session';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { useNavigate } from 'react-router-dom';

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

const HomePage = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [search, setSearch] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loader, setLoader] = useState<boolean>(false);
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

    const debounceSearchTerm = useDebounce(search, 500);

    const sortRef = useRef<HTMLDivElement>(null);

    const closeSort = useCallback(() => {
        setIsSortOpen(false);
    }, []);

    useOutsideClick(sortRef, closeSort);

    const closeLang = useCallback(() => {
        setIsLangOpen(false);
    }, []);

    useOutsideClick(langRef, closeLang);

    const sorts: Sort[] = [
        { id: 1, title: 'Newest', sort: 'newest' },
        { id: 2, title: 'Oldest', sort: 'oldest' },
        { id: 3, title: 'Soonest', sort: 'soonest' },
        { id: 4, title: 'Latest', sort: 'latest' },
        { id: 5, title: 'least-free', sort: 'least-free' },
        { id: 6, title: 'most-free', sort: 'most-free' },
    ];

    const languages: Language[] = [
        { id: 1, title: 'All', lang: undefined },
        { id: 2, title: 'English', lang: 'eng' },
        { id: 3, title: 'Ukrainian', lang: 'ua' },
    ];

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
                if (controller.signal.aborted || axios.isCancel(error)) {
                    return;
                }

                if (axios.isAxiosError(err)) {
                    const message =
                        err.response?.data?.message || 'Error retrieving the list of sessions';
                    setError(message);
                } else {
                    setError('An unexpected error occurred');
                    console.error('Error unknown:', error);
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
        <div>
            <button onClick={() => navigate('')}>Create Session</button>
            <input
                type="text"
                value={search}
                onChange={e => {
                    setPage(1);
                    setLoader(false);
                    setBtnLoader(false);
                    setSearch(e.target.value);
                }}
            />
            <div className="sort" ref={sortRef}>
                <div className="sort-container" onClick={() => setIsSortOpen(prev => !prev)}>
                    <p>{sorts.find(s => s.sort === sortBy)?.title}</p>
                    {!isSortOpen ? <ArrowDown /> : <ArrowUp />}
                </div>
                {isSortOpen &&
                    sorts.map(sort => (
                        <div
                            key={sort.id}
                            onClick={() => {
                                setSortBy(sort.sort);
                                setPage(1);
                                setIsSortOpen(false);
                            }}
                        >
                            {sort.title}
                        </div>
                    ))}
            </div>
            <div className="sort-lan" ref={langRef}>
                <div className="sort-lan__container" onClick={() => setIsLangOpen(prev => !prev)}>
                    <p>{languages.find(l => l.lang === language)?.title}</p>
                    {!isLangOpen ? <ArrowDown /> : <ArrowUp />}
                </div>
                {isLangOpen &&
                    languages.map(lang => (
                        <div
                            key={lang.id}
                            onClick={() => {
                                setLanguage(lang.lang);
                                setPage(1);
                                setIsLangOpen(false);
                            }}
                        >
                            {lang.title}
                        </div>
                    ))}
            </div>
            <div>
                <div>
                    <label htmlFor="checkbox">Only available sessions</label>
                    <input
                        type="checkbox"
                        id="checkbox"
                        checked={available}
                        onChange={() => {
                            setPage(1);
                            setAvailable(prev => !prev);
                        }}
                    />
                </div>
                <div>
                    {error && <div>{error}</div>}
                    {loader && sessions.length === 0 && <div>Loading...</div>}
                    {sessions.length === 0 && !loader && !error && <div>Sessions not found</div>}
                    {sessions.map(session => (
                        <SessionCard key={session.id} session={session} />
                    ))}
                </div>
            </div>
            {error && (
                <button
                    onClick={() => {
                        setRetryCount(prev => prev + 1);
                    }}
                    disabled={loader || btnLoader}
                >
                    Try again
                </button>
            )}

            {hasMore && !error && (
                <button onClick={() => setPage(prev => prev + 1)} disabled={btnLoader || loader}>
                    {btnLoader ? 'Loading...' : 'Show more sessions...'}
                </button>
            )}
        </div>
    );
};

export default HomePage;
