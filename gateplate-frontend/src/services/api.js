import axios from 'axios';

// Адреса твого Django сервера (за замовчуванням 8000)
const API_BASE_URL = 'http://127.0.0.1:8000/api/';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Функція для отримання журналу розпізнаних номерів
export const getDetectedPlates = () => api.get('detected-plates/'); 

export default api;