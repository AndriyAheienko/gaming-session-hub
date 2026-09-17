import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

export const query = (sql: string, params?: any[]) => {
    return pool.query(sql, params);
};

export default pool;
