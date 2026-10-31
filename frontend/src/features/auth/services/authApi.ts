import api from '../../../services/api';
import type { RegisterResponse, LoginResponse, User } from '../types/auth';

export const register = async (
    name: string,
    email: string,
    password: string,
): Promise<RegisterResponse> => {
    const { data } = await api.post<RegisterResponse>('/auth/register', { name, email, password });
    return data;
};

export const login = async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
    return data;
};

export const getUserInfo = async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
};
