import type { Response } from 'express';
import type { AuthRequest } from '../types/express.types.js';
import { getGames } from '../services/rawgService.js';
import { querySchema } from '../schema/games.schema.js';
import { errorZod } from '../utils/errorZod.js';

export const searchGames = async (req: AuthRequest, res: Response): Promise<void> => {
    const ownerId = req.user?.userId;

    try {
        if (!ownerId) {
            res.status(401).json({
                message: 'The user does not have access to perform this operation',
            });
            return;
        }

        const query = querySchema.parse(req.query);

        const games = await getGames(query.searchQuery, query.pageSize);

        res.status(200).json(games);
    } catch (error) {
        if (errorZod(res, error)) {
            return;
        }

        throw error;
    }
};
