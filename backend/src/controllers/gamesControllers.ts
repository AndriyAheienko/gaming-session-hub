import type { Request, Response } from 'express';
import { getGames } from '../services/rawgService.js';
import { querySchema } from '../schema/games.schema.js';
import { errorZod } from '../utils/errorZod.js';

export const searchGames = async (req: Request, res: Response): Promise<void> => {
    try {
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
