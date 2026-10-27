import { useState, useEffect, useRef, useCallback } from 'react';
import { getSessions } from '../features/sessions/services/sessionApi';
import type { Session } from '../features/sessions/types/session';
import { useDebounce } from '../hooks/useDebounce';
import SessionCard from '../features/sessions/components/SessionCard';
import axios from 'axios';
import type { SessionSort } from '../features/sessions/types/session';
import { ArrowDown } from 'lucide-react';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface Sort {
    id: number;
    title: string;
    sort: SessionSort;
}

const HomePage = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [search, setSearch] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loader, setLoader] = useState<boolean>(false);

    const [sortBy, setsortBy] = useState<SessionSort>('newest');
    const [isOpen, setIsOpen] = useState(false);

    const debounceSearchTerm = useDebounce(search, 500);
    const sortRef = useRef<HTMLDivElement>(null);
    const closeSort = useCallback(() => {
        setIsOpen(false);
    }, []);
    useOutsideClick(sortRef, closeSort);

    const sorts: Sort[] = [
        { id: 1, title: 'Newest', sort: 'newest' },
        { id: 2, title: 'Oldest', sort: 'oldest' },
        { id: 3, title: 'Soonest', sort: 'soonest' },
        { id: 4, title: 'Latest', sort: 'latest' },
        { id: 5, title: 'least-free', sort: 'least-free' },
        { id: 6, title: 'most-free', sort: 'most-free' },
    ];

    useEffect(() => {
        const controller = new AbortController();

        const getAllSessions = async () => {
            setLoader(true);
            setError('');

            try {
                const sessionList = await getSessions(
                    {
                        page: 1,
                        limit: 10,
                        sort: sortBy,
                        search: debounceSearchTerm,
                        available: false,
                        language: 'eng',
                    },
                    { signal: controller.signal },
                );
                setSessions(sessionList);
            } catch (error) {
                if (axios.isCancel(error)) {
                    return;
                }

                if (axios.isAxiosError(error)) {
                    const message =
                        error.response?.data?.message || 'Error retrieving the list of sessions';
                    setError(message);
                } else {
                    setError('An unexpected error occurred');
                    console.error('Error unknown:', error);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoader(false);
                }
            }
        };

        getAllSessions();

        return () => controller.abort();
    }, [debounceSearchTerm, sortBy]);

    return (
        <div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="sort" ref={sortRef}>
                <div
                    className="sort-container"
                    onClick={e => {
                        setIsOpen(true);
                        e.stopPropagation();
                    }}
                >
                    <p>{sorts.find(s => s.sort === sortBy)?.title}</p>
                    <ArrowDown />
                </div>
                {isOpen &&
                    sorts.map(sort => (
                        <div
                            key={sort.id}
                            onClick={() => {
                                setsortBy(sort.sort);
                                setIsOpen(false);
                            }}
                        >
                            {sort.title}
                        </div>
                    ))}
            </div>
            <div>
                <div>
                    {error && <div>{error}</div>}
                    {loader && <div>Loading...</div>}
                    {!error && !loader && sessions.length === 0 && <div>Sessions not found</div>}
                    {!error &&
                        !loader &&
                        sessions.map(session => <SessionCard key={session.id} session={session} />)}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
