import query from '../config/bd.js';

const initDB = async () => {
    const createTables = `
        -- users tables
        CREATE TABLE IF NOT EXIST users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR (200) UNIQUE NOT NULL,
            password_hash (200) NOT NULL,
            avatar_url TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- games tables
        CREATE TABLE IF NOT EXIST (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) DELETE CASCADE,
            name VARCHAR(150) NOT NULL,
            slug VARCHAR(100),
            
            
        )
            
        -- sessions tables
        
        -- sessions-members tables
        
        -- messages tables
    `;

    try {
        await query(createTables);
        console.log('The databases have been successfully created and verified');
    } catch (error) {
        console.error('Error initializing the database:', error);
    }
};
