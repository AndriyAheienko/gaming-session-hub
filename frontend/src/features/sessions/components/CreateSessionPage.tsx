import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, X, Gamepad2, Clock3, Users, Mic, Languages } from 'lucide-react';

import { createSession } from '../../sessions/services/sessionApi';
import { searchGames } from '../../../services/games';
import type { CreateSessionPayload, SessionLanguage } from '../types/session';

import { useDebounce } from '../../../hooks/useDebounce';

import '../components/CreateSessionPage.scss';
interface RawgGame {
    rawg_id: number;
    name: string;
    slug: string;
    background_image: string | null;
    rating: number;
    genres: string;
}

interface LanguageOption {
    value: SessionLanguage;
    label: string;
}

const languages: LanguageOption[] = [
    { value: 'eng', label: 'English' },
    { value: 'ua', label: 'Ukrainian' },
];

const getMinDateTime = (): string => {
    const date = new Date(Date.now() + 5 * 60 * 1000);

    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

    return date.toISOString().slice(0, 16);
};

const CreateSessionPage = () => {
    const [gameSearch, setGameSearch] = useState('');
    const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);
    const [foundGames, setFoundGames] = useState<RawgGame[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isGameListOpen, setIsGameListOpen] = useState(false);
    const [gameSearchError, setGameSearchError] = useState('');
    const [title, setTitle] = useState('');
    const [language, setLanguage] = useState<SessionLanguage>('eng');
    const [maxPlayers, setMaxPlayers] = useState('2');
    const [micRequired, setMicRequired] = useState(false);
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const debouncedGameSearch = useDebounce(gameSearch, 400);
    const searchTerm = debouncedGameSearch.trim();
    const isSearchInvalid = searchTerm.length < 2 || selectedGame;
    const games = isSearchInvalid ? [] : foundGames;

    const navigate = useNavigate();

    useEffect(() => {
        if (isSearchInvalid) {
            return;
        }

        const controller = new AbortController();

        const findGames = async () => {
            setIsSearching(true);
            setGameSearchError('');

            try {
                const result = await searchGames(
                    { searchQuery: searchTerm, pageSize: 10 },
                    {
                        signal: controller.signal,
                    },
                );

                setFoundGames(result);
                setIsGameListOpen(true);
            } catch (err) {
                if (controller.signal.aborted || axios.isCancel(err)) {
                    return;
                }

                setGameSearchError(
                    axios.isAxiosError(err)
                        ? err.response?.data?.message || 'Failed to search games'
                        : 'An unexpected error occurred',
                );

                setFoundGames([]);
            } finally {
                if (!controller.signal.aborted) {
                    setIsSearching(false);
                }
            }
        };

        findGames();

        return () => {
            controller.abort();
            setIsSearching(false);
        };
    }, [debouncedGameSearch, selectedGame, isSearchInvalid, searchTerm]);

    const handleGameSearch = (value: string) => {
        setGameSearch(value);
        setSelectedGame(null);
        setIsGameListOpen(true);
        setGameSearchError('');
    };

    const handleSelectGame = (game: RawgGame) => {
        setSelectedGame(game);
        setGameSearch(game.name);
        setFoundGames([]);
        setIsGameListOpen(false);
        setGameSearchError('');
    };

    const handleRemoveGame = () => {
        setSelectedGame(null);
        setGameSearch('');
        setFoundGames([]);
        setIsGameListOpen(false);
    };

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();

        setError('');
        setSuccess('');

        if (!selectedGame) {
            setError('Please select a game from the search results');
            return;
        }

        if (!startsAt || new Date(startsAt) <= new Date()) {
            setError('Please select a future session start time');
            return;
        }

        const payload: CreateSessionPayload = {
            title: title.trim(),
            maxPlayers: Number(maxPlayers),
            startsAt: new Date(startsAt).toISOString(),
            language,
            micRequired,
            description: description.trim() || undefined,
            rawg_id: selectedGame.rawg_id,
        };

        setIsSubmitting(true);

        try {
            await createSession(payload);

            setSuccess('Your gaming session has been created successfully!');
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || 'Failed to create the session');
            } else {
                setError('An unexpected error occurred');
                console.error('Create session error:', err);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="create-session-page">
            <div className="create-session-page__container">
                <header className="create-session-page__header">
                    <span className="create-session-page__eyebrow">BUILD YOUR TEAM</span>

                    <h1 className="create-session-page__title">Create a gaming session</h1>

                    <p className="create-session-page__description">
                        Choose a game, set up your session and find players to play with.
                    </p>
                </header>

                <form className="create-session-form" onSubmit={handleSubmit}>
                    <section
                        className="create-session-form__section"
                        aria-labelledby="game-selection-title"
                    >
                        <div className="create-session-form__section-heading">
                            <div className="create-session-form__section-icon">
                                <Gamepad2 size={20} />
                            </div>

                            <div>
                                <h2
                                    className="create-session-form__section-title"
                                    id="game-selection-title"
                                >
                                    Choose a game
                                </h2>

                                <p className="create-session-form__section-description">
                                    Find the game you want to play.
                                </p>
                            </div>
                        </div>

                        <div className="game-search">
                            <label className="game-search__label" htmlFor="game-search">
                                Search game
                            </label>

                            <div className="game-search__input-wrapper">
                                <Search
                                    className="game-search__icon"
                                    size={19}
                                    aria-hidden="true"
                                />

                                <input
                                    className="game-search__input"
                                    id="game-search"
                                    type="search"
                                    placeholder="For example: The Witcher 3..."
                                    value={gameSearch}
                                    autoComplete="off"
                                    aria-controls="game-search-results"
                                    aria-expanded={isGameListOpen && games.length > 0}
                                    onFocus={() => {
                                        if (games.length > 0) {
                                            setIsGameListOpen(true);
                                        }
                                    }}
                                    onChange={e => handleGameSearch(e.target.value)}
                                />

                                {gameSearch && (
                                    <button
                                        className="game-search__clear"
                                        type="button"
                                        aria-label="Clear game search"
                                        onClick={handleRemoveGame}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>

                            {isSearching && (
                                <p className="game-search__status" role="status">
                                    Searching games...
                                </p>
                            )}

                            {gameSearch.trim().length === 1 && (
                                <p className="game-search__hint">Enter at least 2 characters.</p>
                            )}

                            {gameSearchError && (
                                <p
                                    className="game-search__message game-search__message--error"
                                    role="alert"
                                >
                                    {gameSearchError}
                                </p>
                            )}

                            {isGameListOpen && games.length > 0 && (
                                <ul className="game-search__results" id="game-search-results">
                                    {games.slice(0, 7).map(game => (
                                        <li className="game-search__result" key={game.rawg_id}>
                                            <button
                                                className="game-search__result-button"
                                                type="button"
                                                onClick={() => handleSelectGame(game)}
                                            >
                                                {game.background_image ? (
                                                    <img
                                                        className="game-search__result-image"
                                                        src={game.background_image}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span className="game-search__result-placeholder">
                                                        <Gamepad2 size={22} />
                                                    </span>
                                                )}

                                                <span className="game-search__result-info">
                                                    <span className="game-search__result-name">
                                                        {game.name}
                                                    </span>

                                                    <span className="game-search__result-meta">
                                                        Rating: {game.rating || 'N/A'}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {!isSearching &&
                                !gameSearchError &&
                                debouncedGameSearch.trim().length >= 2 &&
                                games.length === 0 &&
                                !selectedGame && (
                                    <p className="game-search__message">
                                        No games found. Try another search.
                                    </p>
                                )}
                        </div>

                        {selectedGame && (
                            <div className="selected-game">
                                {selectedGame.background_image ? (
                                    <img
                                        className="selected-game__image"
                                        src={selectedGame.background_image}
                                        alt=""
                                    />
                                ) : (
                                    <div className="selected-game__placeholder">
                                        <Gamepad2 size={30} />
                                    </div>
                                )}

                                <div className="selected-game__info">
                                    <span className="selected-game__label">Selected game</span>

                                    <h3 className="selected-game__name">{selectedGame.name}</h3>

                                    <span className="selected-game__meta">
                                        {' · '}
                                        Rating: {selectedGame.rating || 'N/A'}
                                    </span>
                                </div>

                                <button
                                    className="selected-game__remove"
                                    type="button"
                                    aria-label="Remove selected game"
                                    onClick={handleRemoveGame}
                                >
                                    <X size={19} />
                                </button>
                            </div>
                        )}
                    </section>

                    <section
                        className="create-session-form__section"
                        aria-labelledby="session-details-title"
                    >
                        <div className="create-session-form__section-heading">
                            <div className="create-session-form__section-icon">
                                <Users size={20} />
                            </div>

                            <div>
                                <h2
                                    className="create-session-form__section-title"
                                    id="session-details-title"
                                >
                                    Session details
                                </h2>

                                <p className="create-session-form__section-description">
                                    Configure your gaming session.
                                </p>
                            </div>
                        </div>

                        <div className="create-session-form__fields">
                            <div className="create-session-form__field create-session-form__field--full">
                                <label
                                    className="create-session-form__label"
                                    htmlFor="session-title"
                                >
                                    Session title
                                </label>

                                <input
                                    className="create-session-form__input"
                                    id="session-title"
                                    type="text"
                                    placeholder="e.g. Looking for players for a co-op adventure"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={200}
                                    required
                                />
                            </div>

                            <div className="create-session-form__field">
                                <label className="create-session-form__label" htmlFor="max-players">
                                    Maximum players
                                </label>

                                <input
                                    className="create-session-form__input"
                                    id="max-players"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={maxPlayers}
                                    onChange={e => setMaxPlayers(e.target.value)}
                                    required
                                />

                                <span className="create-session-form__hint">
                                    Includes you as the session owner.
                                </span>
                            </div>

                            <div className="create-session-form__field">
                                <label className="create-session-form__label" htmlFor="starts-at">
                                    <Clock3 size={15} />
                                    Start date and time
                                </label>

                                <input
                                    className="create-session-form__input"
                                    id="starts-at"
                                    type="datetime-local"
                                    min={getMinDateTime()}
                                    value={startsAt}
                                    onChange={e => setStartsAt(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="create-session-form__field">
                                <label
                                    className="create-session-form__label"
                                    htmlFor="session-language"
                                >
                                    <Languages size={15} />
                                    Session language
                                </label>

                                <select
                                    className="create-session-form__input"
                                    id="session-language"
                                    value={language}
                                    onChange={e => setLanguage(e.target.value as SessionLanguage)}
                                >
                                    {languages.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <label className="create-session-form__mic-option">
                                <input
                                    className="create-session-form__mic-checkbox"
                                    type="checkbox"
                                    checked={micRequired}
                                    onChange={e => setMicRequired(e.target.checked)}
                                />

                                <span className="create-session-form__mic-control">
                                    <Mic size={17} />
                                </span>

                                <span className="create-session-form__mic-text">
                                    <span className="create-session-form__mic-title">
                                        Microphone required
                                    </span>

                                    <span className="create-session-form__mic-description">
                                        Players must have a working microphone.
                                    </span>
                                </span>
                            </label>

                            <div className="create-session-form__field create-session-form__field--full">
                                <label
                                    className="create-session-form__label"
                                    htmlFor="session-description"
                                >
                                    Description
                                    <span className="create-session-form__optional">Optional</span>
                                </label>

                                <textarea
                                    className="create-session-form__textarea"
                                    id="session-description"
                                    placeholder="Tell other players about your session, rules or plans..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    maxLength={1000}
                                    rows={5}
                                />

                                <span className="create-session-form__hint">
                                    {description.length}/1000 characters
                                </span>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <p
                            className="create-session-form__message create-session-form__message--error"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    {success && (
                        <p
                            className="create-session-form__message create-session-form__message--success"
                            role="status"
                        >
                            {success}
                        </p>
                    )}

                    <footer className="create-session-form__footer">
                        <button
                            className="create-session-form__cancel"
                            type="button"
                            onClick={() => navigate('/')}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>

                        <button
                            className="create-session-form__submit"
                            type="submit"
                            disabled={isSubmitting || Boolean(success)}
                        >
                            {isSubmitting ? 'Creating session...' : 'Create session'}
                        </button>
                    </footer>
                </form>
            </div>
        </main>
    );
};

export default CreateSessionPage;
