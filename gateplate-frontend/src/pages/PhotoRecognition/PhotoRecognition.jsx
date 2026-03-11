import React, { useState, useRef, useContext } from 'react'; // Додано useContext
import axios from 'axios';
import { DataContext } from '../../DataContext'; // Імпортуємо контекст даних
import { Upload, Camera, CheckCircle, XCircle, User, Phone, ShieldCheck } from 'lucide-react';
import './PhotoRecognition.css';

const PhotoRecognition = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
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
            setResult(res.data);
        } catch (err) {
            console.error(err);
            alert("Помилка при обробці зображення. Перевірте з'єднання або API-ключ.");
        } finally {
            setLoading(false);
        }
    };

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
                    <div className={`result-card-minimal animate-fade-in ${result.is_known && isStaff ? 'status-allowed' : 'status-neutral'}`}>
                        <div className="result-header">
                            {result.is_known ? <CheckCircle color="#10b981" /> : <XCircle color="#ef4444" />}
                            <span className="plate-number-res">{result.plate_text}</span>
                        </div>

                        {/* Секція ТІЛЬКИ для Адміна та Оператора */}
                        {isStaff ? (
                            <div className="result-details staff-info animate-fade-in">
                                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />
                                <p><User size={14} /> <strong>Власник:</strong> {result.owner_name || "Невідомо"}</p>
                                <p><ShieldCheck size={14} /> <strong>Статус:</strong> {result.is_known ? "Дозволено" : "Заборонено"}</p>
                                {result.owner_phone && <p><Phone size={14} /> <strong>Тел:</strong> {result.owner_phone}</p>}
                                <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '5px' }}>
                                    Точність AI: {(result.confidence * 100).toFixed(1)}%
                                </p>
                            </div>
                        ) : (
                            /* Секція для ГОСТЯ (мінімум інформації) */
                            <div className="result-details guest-info">
                                <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                                    Номер розпізнано. Результат оброблено системою GatePlate.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PhotoRecognition;