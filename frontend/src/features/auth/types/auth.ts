interface LoginUser {
    name: string;
    email: string;
}

export interface RegisterResponse {
    message: string;
    user: LoginUser;
}

export interface LoginResponse {
    message: string;
    token: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    rating_sum: number;
    avatar_url: string | null;
    created_at: string;
}
