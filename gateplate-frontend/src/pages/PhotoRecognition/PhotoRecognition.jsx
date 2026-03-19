import React, { useState, useRef, useContext } from 'react'; // Додано useContext
import axios from 'axios';
import { DataContext } from '../../DataContext'; // Імпортуємо контекст даних
import { Upload, Camera, CheckCircle, XCircle, User, Phone, ShieldCheck, Lock, Zap, X } from 'lucide-react';
import './PhotoRecognition.css';

const PhotoRecognition = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const fileInputRef = useRef(null);

    // Отримуємо роль користувача з контексту
    const { userRole } = useContext(DataContext); 
    const isStaff = userRole === 'Administrators' || userRole === 'Operators';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('car_image', file);

        try {
            const res = await axios.post('http://127.0.0.1:8000/api/recognize-photo/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.limit_reached) {
                setShowPaymentModal(true);
            } else {
                setResult(res.data);
            }
        } catch (err) {
            console.error(err);
            alert("Помилка при обробці зображення. Перевірте з'єднання або API-ключ.");
        } finally {
            setLoading(false);
        }
    };

    console.log("Поточний результат у React:", result);

    return (
        <div className="photo-recon-container">
            <div className="photo-recon-card">
                <div className="guest-reg-header">
                    <Camera size={32} color="#00BFA5" />
                    <h2>Фото <span>Аналіз</span></h2>
                    <p>Завантажте знімок для миттєвої перевірки у базі</p>
                </div>

                {!preview ? (
                    <div className="upload-area-minimal" onClick={() => fileInputRef.current.click()}>
                        <Upload size={48} color="#00BFA5" />
                        <h3>Натисніть для завантаження</h3>
                        <p>або перетягніть файл сюди</p>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            hidden 
                        />
                    </div>
                ) : (
                    <div className="preview-container-minimal">
                        <img src={preview} alt="Preview" className="img-preview" />
                        <div className="preview-actions">
                            <button className="btn-secondary" onClick={() => {setPreview(null); setFile(null); setResult(null);}}>
                                Скасувати
                            </button>
                            <button className="guest-submit-btn" onClick={handleProcess} disabled={loading}>
                                {loading ? "Обробка..." : "ОБРОБИТИ"}
                            </button>
                        </div>
                    </div>
                )}

                {result && (
                    <div className={`result-card-minimal animate-fade-in ${result.is_known ? 'status-known' : 'status-unknown'}`}>
                        <div className="result-header">
                            {result.is_known ? <CheckCircle color="#10b981" size={24} /> : <XCircle color="#ef4444" size={24} />}
                            <span className="plate-number-res">{result.plate_text}</span>
                        </div>

                        {/* ПРЯМА ПЕРЕВІРКА: якщо є ім'я — показуємо деталі */}
                        {(isStaff || result.owner_name) ? (
                            <div className="result-details staff-info">
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '15px 0' }}></div>
                                
                                <div className="detail-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <User size={18} color="#00BFA5" />
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Власник:</span>
                                        <span style={{ fontWeight: '600', color: '#fff' }}>{result.owner_name}</span>
                                    </div>
                                </div>

                                <div className="detail-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <Phone size={18} color="#00BFA5" />
                                    <div>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Контакт:</span>
                                        <span style={{ fontWeight: '600', color: '#fff' }}>{result.owner_phone || "---"}</span>
                                    </div>
                                </div>

                                <div className="confidence-meter" style={{ marginTop: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '5px' }}>
                                        <span>Точність AI</span>
                                        <span>{Math.round(result.confidence * 100)}%</span>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ 
                                            width: `${result.confidence * 100}%`, 
                                            height: '100%', 
                                            background: '#00BFA5',
                                            transition: 'width 0.5s ease'
                                        }}></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="result-details guest-info">
                                <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8', marginTop: '15px' }}>
                                    Номер розпізнано. Результат оброблено системою GatePlate.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* МОДАЛЬНЕ ВІКНО ОПЛАТИ */}
            {showPaymentModal && (
                <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}>
                            <X size={20} />
                        </button>
                        
                        <div className="modal-icon-wrapper">
                            <div className="modal-icon-glow"></div>
                            <Lock size={40} color="#00BFA5" />
                        </div>
                        
                        <h2 className="modal-title">Безкоштовний ліміт<br/><span>вичерпано</span></h2>
                        
                        <p className="modal-description">
                            Ви використали свою безкоштовну спробу розпізнавання номерного знаку.
                        </p>

                        <div className="modal-promo-card">
                            <Zap size={20} color="#facc15" />
                            <p>
                                Отримавши <strong>платну версію</strong>, ви отримаєте <strong>API-ключ</strong> та 
                                <strong> нескінченну кількість спроб</strong> розпізнавання номерних знаків.
                            </p>
                        </div>

                        <div className="modal-features">
                            <div className="modal-feature"><CheckCircle size={16} color="#10b981" /><span>Необмежене розпізнавання</span></div>
                            <div className="modal-feature"><CheckCircle size={16} color="#10b981" /><span>Персональний API-ключ</span></div>
                            <div className="modal-feature"><CheckCircle size={16} color="#10b981" /><span>Пріоритетна підтримка</span></div>
                        </div>

                        <button className="modal-buy-btn" onClick={() => {}}>
                            Оформити
                        </button>
                        
                        <button className="modal-cancel-btn" onClick={() => setShowPaymentModal(false)}>
                            Пізніше
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoRecognition;