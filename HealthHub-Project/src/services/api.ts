import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 300000,
});

function isTokenExpired(token: string): boolean {
    try {
        // JWT usa base64url (- e _ em vez de + e /); atob() só aceita base64 padrão
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}

function clearAuthAndRedirect() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('nome');
    window.location.href = '/';
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        if (isTokenExpired(token)) {
            clearAuthAndRedirect();
            return Promise.reject(new Error('Token expirado. Faça login novamente.'));
        }
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor de resposta: logout automático em caso de 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
            clearAuthAndRedirect();
        }
        return Promise.reject(error);
    }
);

export default api;
