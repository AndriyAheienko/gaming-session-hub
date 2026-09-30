import { Pool, type QueryConfig } from 'pg';
import { env } from './env.js';

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

pool.on('error', error => {
    console.error('Unexpected PostgreSQL pool error:', error);
});

export const query = (sql: string, params?: QueryConfig['values']) => {
    return pool.query(sql, params);
};

export const closePool = () => pool.end();

export default pool;
