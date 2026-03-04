import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Додаємо інтерцептор САМЕ СЮДИ, щоб токен прикріплювався до кожного запиту
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Формат "Token <key>" для Django REST Framework
            config.headers.Authorization = `Token ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Функція для отримання журналу розпізнаних номерів
export const getDetectedPlates = () => api.get('detected-plates/'); 

export default api;