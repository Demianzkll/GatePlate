import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        password: '',
        confirmPassword: '' // Поле для повторного введення пароля
    });
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();

        // Перевірка збігу паролів на стороні клієнта
        if (formData.password !== formData.confirmPassword) {
            alert("Паролі не збігаються!");
            return;
        }

        try {
            // Відправляємо дані на бекенд (без confirmPassword)
            const { confirmPassword, ...dataToSend } = formData;
            await axios.post('http://127.0.0.1:8000/api/register/', dataToSend);
            
            alert("Реєстрація успішна! Тепер увійдіть у систему.");
            navigate('/login');
        } catch (err) {
            console.error(err);
            alert("Помилка реєстрації. Перевірте правильність даних або спробуйте інший логін.");
        }
    };

    return (
        <div className="login-overlay">
            <div className="login-card">
                <h2>Реєстрація <span>GatePlate</span></h2>
                <form onSubmit={handleSignup}>
                    <input 
                        type="text" 
                        placeholder="Ім'я" 
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                        required 
                    />
                    <input 
                        type="text" 
                        placeholder="Прізвище" 
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                        required 
                    />
                    <input 
                        type="tel" 
                        placeholder="Номер телефону (+380...)" 
                        onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                        required 
                    />
                    <hr className="form-divider" />
                    <input 
                        type="text" 
                        placeholder="Логін (username)" 
                        onChange={(e) => setFormData({...formData, username: e.target.value})} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Пароль" 
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Підтвердіть пароль" 
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                        required 
                    />
                    <button type="submit" className="login-btn">Створити акаунт</button>
                </form>
                <Link to="/login" className="signup-link">Вже є акаунт? Увійти</Link>
            </div>
        </div>
    );
};

export default Signup;