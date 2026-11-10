import api from './api';
import type { SearchQuery, RawgGame } from '../types/games.types';
import type { AxiosRequestConfig } from 'axios';

export const searchGames = async (
    params: SearchQuery,
    config?: AxiosRequestConfig,
): Promise<RawgGame[]> => {
    const { data } = await api.get<RawgGame[]>('/games', { ...config, params });
    return data;
};
