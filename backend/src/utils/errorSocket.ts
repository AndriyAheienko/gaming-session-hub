import z from 'zod';
import type { callbackError } from '../types/socket.types.js';

export const errorSocket = (
    error: unknown,
    callback: ((data: callbackError) => void) | undefined,
) => {
    if (error instanceof z.ZodError) {
        const errors = error.issues.reduce<Record<string, string>>((acc, error) => {
            const [key] = error.path;

            if (typeof key === 'string') {
                acc[key] = error.message;
            }

            return acc;
        }, {});

        if (typeof callback === 'function') {
            callback({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }
    } else {
        console.error('Internal server error: ', error);

        if (typeof callback === 'function') {
            callback({
                success: false,
                message: 'Internal server error',
            });
        }
    }
};
