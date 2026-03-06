import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        localStorage.clear()
        e.preventDefault();
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/login/', { username, password });
            
            // 1. Зберігаємо всі дані, включаючи РОЛЬ
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('username', username);
            localStorage.setItem('role', res.data.role); // <-- Додали цей рядок
            
            onLogin();

            // 2. Читаємо роль і вирішуємо, куди направити користувача
            const userRole = res.data.role;

            if (userRole === 'Administrators' || userRole === 'Operators') {
                // Перекидаємо персонал на головну панель з таблицями
                navigate('/'); 
            } else {
                // Перекидаємо гостей на їхню сторінку (заміни '/guest' на свій шлях, якщо він інший)
                navigate('/guest'); 
            }

        } catch (err) {
            console.error("Помилка входу:", err.response?.data);
            alert("Невірний логін або пароль");
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-card">
                <h2>Вхід у <span>GatePlate</span></h2>
                <form onSubmit={handleLogin}>
                    <input 
                        type="text" 
                        placeholder="Логін" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Пароль" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                    <button type="submit" className="login-btn">Увійти</button>
                </form>
                
                <div className="auth-footer">
                    <p>Немає акаунта?</p>
                    <Link to="/signup" className="signup-link">Зареєструватися</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;