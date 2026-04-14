import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Car, CheckCircle, AlertCircle, Camera, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import './GuestRegistration.css';

const GuestRegistration = () => {
    const [plate, setPlate] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        try {
            await axios.post('http://127.0.0.1:8000/api/guest/register/', {
                plate_text: plate.toUpperCase().replace(/\s/g, ''),
                brand_model: "Гість (Self-reg)"
            });

            setStatus({ 
                type: 'success', 
                message: 'Авто успішно зареєстровано! Проїзд дозволено.' 
            });
            setPlate('');
        } catch (err) {
            setStatus({ 
                type: 'error', 
                message: 'Помилка реєстрації. Перевірте дані.' 
            });
        }
    };


    return (
        <div className="guest-page-wrapper">
            <div className="guest-split-layout">
                
                {/* ЛІВА ЧАСТИНА: Рекламне запрошення */}
                <div className="guest-promo-section">
                    <div className="promo-content">
                        <div className="promo-badge">AI VISION TECHNOLOGY</div>
                        <h1>Розпізнавання <span>по фото</span></h1>
                        <p className="promo-subtitle">
                            Спробуйте нашу нейронну мережу в дії. Один раз — <strong>безкоштовно</strong>.
                        </p>
                        
                        <div className="promo-features">
                            <div className="feature">
                                <Zap size={18} className="feat-icon" />
                                <span>Миттєвий аналіз номера</span>
                            </div>
                            <div className="feature">
                                <ShieldCheck size={18} className="feat-icon" />
                                <span>Перевірка прав доступу</span>
                            </div>
                            <div className="feature">
                                <Camera size={18} className="feat-icon" />
                                <span>API доступ при підписці</span>
                            </div>
                        </div>

                        <div className="promo-offer-card">
                            <p>Отримайте повний API доступ до нашої моделі після першої оплати</p>
                            <button 
                                className="promo-btn"
                                onClick={() => navigate('/photo-analysis')}
                            >
                                Спробувати безкоштовно <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ПРАВА ЧАСТИНА: Форма реєстрації (Твоя існуюча картка) */}
                <div className="guest-form-section">
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

            </div>
        </div>
    );
};

export default GuestRegistration;