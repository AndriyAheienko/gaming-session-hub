import type { AxiosRequestConfig } from 'axios';
import api from '../../../services/api';
import type { Session, SessionSort, SessionLanguage, GetSessionsResponse } from '../types/session';

export const getSessions = async (
    params: {
        page: number;
        limit: number;
        sort: SessionSort;
        search: string;
        available: boolean;
        language: SessionLanguage;
    },
    config?: AxiosRequestConfig,
): Promise<Session[]> => {
    const { data } = await api.get<GetSessionsResponse>('/sessions', {
        ...config,
        params,
    });

    return data.sessions;
};
