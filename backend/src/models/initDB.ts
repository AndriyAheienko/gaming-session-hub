import { query } from '../config/bd.js';

export const initDB = async () => {
    const createTables = `
        -- users
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(200) UNIQUE NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            rating_sum NUMERIC(5, 1) NOT NULL DEFAULT 0,
            rating_count INTEGER NOT NULL DEFAULT 0,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- games
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            rawg_id INTEGER UNIQUE,
            name VARCHAR(150) NOT NULL,
            slug VARCHAR(100),
            background_image TEXT,
            rating NUMERIC(3, 2),
            genre VARCHAR(100)
        );

        -- sessions
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            game_id INTEGER NOT NULL REFERENCES games(id),
            owner_id INTEGER NOT NULL REFERENCES users(id),
            status VARCHAR(50) NOT NULL DEFAULT 'waiting',
            max_players INTEGER NOT NULL,
            starts_at TIMESTAMPTZ NOT NULL,
            language VARCHAR(50) NOT NULL DEFAULT 'eng',
            mic_required BOOLEAN NOT NULL DEFAULT FALSE,
            description TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- session_members
        CREATE TABLE IF NOT EXISTS session_members (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL DEFAULT 'member',
            joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (session_id, user_id)
        );

        -- messages
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            sender_id INTEGER NOT NULL REFERENCES users(id),
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- friendships
        CREATE TABLE IF NOT EXISTS friendships (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- session_invitations
        CREATE TABLE IF NOT EXISTS session_invitations (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- ratings
        CREATE TABLE IF NOT EXISTS ratings (
            id SERIAL PRIMARY KEY,
            rater_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            target_id INTEGER NOT NULL REFERENCES users(id),
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL,
            CHECK (rating BETWEEN 1 AND 5),
            CHECK (rater_id <> target_id),
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (session_id, rater_id, target_id)
        );
    `;

    try {
        await query(createTables);
        console.log('The databases have been successfully created and verified');
    } catch (error) {
        console.error('Error initializing the database:', error);
    }
};
