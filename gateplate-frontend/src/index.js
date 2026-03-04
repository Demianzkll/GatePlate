import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import axios from 'axios'; 

// 1. Встановлюємо базовий URL для всіх запитів до Django
axios.defaults.baseURL = 'http://127.0.0.1:8000';

// 2. Налаштування інтерцептора для передачі токена
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Переконайся, що формат "Token <key>" суворо дотриманий
            config.headers.Authorization = `Token ${token}`; 
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. Додамо обробку глобальних помилок (наприклад, якщо токен застарів)
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Сесія завершена або токен недійсний");
            // Очищаємо дані, щоб App.js перекинув на логін
            localStorage.removeItem('token');
            localStorage.removeItem('username');
        }
        return Promise.reject(error);
    }
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();