import type { PoolClient } from 'pg';

export const errorTransaction = async (client: PoolClient | null): Promise<void> => {
    if (client) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Failed to rollback transaction:', rollbackError);
        }
    }
};
