import { env } from '../config/env.js';
import type { RawgGame, RawgApiGames, GenreApi } from '../types/game.types.js';

const baseUrl = 'https://api.rawg.io/api';

export const getGames = async (searchQuery: string, pageSize: number = 10): Promise<RawgGame[]> => {
    try {
        const url = `${baseUrl}/games?key=${env.RAWG_API_KEY}&search=${searchQuery}&page_size=${pageSize}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Error to load rawg games');
        }

        const result = await response.json();
        const data: RawgGame[] = result.results.map((game: RawgApiGames) => ({
            rawg_id: game.id,
            name: game.name,
            slug: game.slug,
            background_image: game.background_image,
            rating: game.rating,
            genres: game.genres.map((genre: GenreApi) => genre.name).join(', '),
        }));

        return data;
    } catch (error) {
        console.error('Error fetching games from RAWG:', error);
        throw error;
    }
};
