import type { AxiosRequestConfig } from 'axios';
import api from '../../../services/api';
import type {
    GetSessionPayload,
    GetSessionsResponse,
    CreateSessionResponse,
    CreateSessionPayload,
} from '../types/session';

export const getSessions = async (
    params: GetSessionPayload,
    config?: AxiosRequestConfig,
): Promise<GetSessionsResponse> => {
    const { data } = await api.get<GetSessionsResponse>('/sessions', {
        ...config,
        params,
    });

    return data;
};

export const createSession = async (
    payload: CreateSessionPayload,
): Promise<CreateSessionResponse> => {
    const { data } = await api.post<CreateSessionResponse>('/sessions', payload);
    return data;
};
