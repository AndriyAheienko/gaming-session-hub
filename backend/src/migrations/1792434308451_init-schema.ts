import type { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`
        -- users
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(200) NOT NULL,
            password_hash VARCHAR(200) NOT NULL,
            rating_sum NUMERIC(5, 1) NOT NULL DEFAULT 0,
            rating_count INTEGER NOT NULL DEFAULT 0,
            avatar_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT unique_user_email UNIQUE (email)
        );

        -- games
        CREATE TABLE games (
            id SERIAL PRIMARY KEY,
            rawg_id INTEGER UNIQUE,
            name VARCHAR(150) NOT NULL,
            slug VARCHAR(100),
            background_image TEXT,
            rating NUMERIC(3, 2),
            genres VARCHAR(100)
        );

        -- sessions
        CREATE TABLE sessions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            game_id INTEGER NOT NULL REFERENCES games(id),
            owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
            max_players INTEGER NOT NULL CHECK (max_players BETWEEN 1 AND 100),
            starts_at TIMESTAMPTZ NOT NULL,
            language VARCHAR(50) NOT NULL DEFAULT 'eng' CHECK (language IN ('eng', 'ua')),
            mic_required BOOLEAN NOT NULL DEFAULT FALSE,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- session_members
        CREATE TABLE session_members (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
            joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_session_member UNIQUE (session_id, user_id)
        );

        -- messages
        CREATE TABLE messages (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- friendships
        CREATE TABLE friendships (
            id SERIAL PRIMARY KEY,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'deleted')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- INDEX friendships
        CREATE UNIQUE INDEX unique_friendships_between_users
        ON friendships (
            LEAST(sender_id, receiver_id),
            GREATEST(sender_id, receiver_id)
        )
        WHERE status IN ('pending', 'accepted');

        -- session_invitations
        CREATE TABLE session_invitations (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- INDEX session_invitations
        CREATE UNIQUE INDEX unique_pending_session_invitation
        ON session_invitations (
            session_id,
            sender_id,
            receiver_id
        )
        WHERE status = 'pending';

        -- ratings
        CREATE TABLE ratings (
            id SERIAL PRIMARY KEY,
            rater_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL,
            CHECK (rating BETWEEN 1 AND 5),
            CHECK (rater_id <> target_id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT unique_rating_per_session UNIQUE (session_id, rater_id, target_id)
        );

        -- notifications
        CREATE TABLE notifications (
            id SERIAL PRIMARY KEY,
            actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL CHECK (type IN (
                'friend_request', 
                'friend_accepted', 
                'session_invite', 
                'session_joined', 
                'session_left',
                'session_started',
                'session_cancelled',
                'session_completed',
                'new_rating'
            )),
            session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
            friendship_id INTEGER REFERENCES friendships(id) ON DELETE SET NULL,
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.sql(`
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS ratings CASCADE;
        DROP TABLE IF EXISTS session_invitations CASCADE;
        DROP TABLE IF EXISTS friendships CASCADE;
        DROP TABLE IF EXISTS messages CASCADE;
        DROP TABLE IF EXISTS session_members CASCADE;
        DROP TABLE IF EXISTS sessions CASCADE;
        DROP TABLE IF EXISTS games CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
    `);
}
