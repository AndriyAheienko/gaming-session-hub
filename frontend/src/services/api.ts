import axios from 'axios';

if (!import.meta.env.VITE_API_URL) {
    throw new Error('CRITICAL ERROR: VITE_API_URL is not defined in .env file!');
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    response => {
        return response;
    },
    error => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');

            // window.location.href = '/';
        }

        return Promise.reject(error);
    },
);

export default api;
