import jwt from 'jsonwebtoken';

export const isValidPayload = (payload: string | jwt.JwtPayload): payload is { userId: number } => {
    return (
        typeof payload === 'object' &&
        payload !== null &&
        'userId' in payload &&
        typeof payload.userId === 'number' &&
        Number.isInteger(payload.userId) &&
        payload.userId > 0
    );
};
