import React, { useState } from 'react';
import axios from 'axios';
import { Car, CheckCircle, AlertCircle } from 'lucide-react';
import './GuestRegistration.css';

const GuestRegistration = () => {
    const [plate, setPlate] = useState('');
    const [brand, setBrand] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleRegister = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        try {
            // Запит на ендпоінт, який ми створили у Django для гостей
            await axios.post('http://127.0.0.1:8000/api/guest/register/', {
                plate_text: plate.toUpperCase().replace(/\s/g, ''),
                brand_model: brand || "Гість (Self-reg)"
            });

            setStatus({ 
                type: 'success', 
                message: 'Авто успішно зареєстровано! Проїзд дозволено.' 
            });
            setPlate('');
            setBrand('');
        } catch (err) {
            // Якщо виникає помилка 403, перевірте, чи передається токен в interceptors
            setStatus({ 
                type: 'error', 
                message: 'Помилка реєстрації. Перевірте дані або спробуйте пізніше.' 
            });
            console.error("Registration error:", err);
        }
    };

    return (
        <div className="guest-reg-container">
            <div className="guest-reg-card">
                <div className="guest-reg-header">
                    <Car size={40} color="#00BFA5" />
                    <h2>Мій <span>Пропуск</span></h2>
                    <p>Зареєструйте номер авто для автоматичного відкриття воріт</p>
                </div>

                <form onSubmit={handleRegister} className="guest-reg-form">
                    <div className="input-group">
                        <label>Державний номер</label>
                        <input 
                            type="text" 
                            placeholder="Наприклад: BC7777CX"
                            value={plate}
                            onChange={(e) => setPlate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Марка / Модель</label>
                        <input 
                            type="text" 
                            placeholder="Наприклад: Tesla Model 3"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="guest-submit-btn">
                        Активувати доступ
                    </button>
                </form>

                {status.message && (
                    <div className={`status-alert ${status.type}`}>
                        {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        <span>{status.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuestRegistration;