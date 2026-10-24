import { useState, useEffect } from 'react';
import { getSessions } from '../features/sessions/services/sessionApi';
import type { Session } from '../features/sessions/types/session';
import { useDebounce } from '../hooks/useDebounce';
import SessionCard from '../features/sessions/components/SessionCard';
import axios from 'axios';

const HomePage = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [search, setSearch] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loader, setLoader] = useState<boolean>(false);

    const debounceSearchTerm = useDebounce(search, 500);

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
                        sort: 'newest',
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
    }, [debounceSearchTerm]);

    return (
        <div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} />
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
