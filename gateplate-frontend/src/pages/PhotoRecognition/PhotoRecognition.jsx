import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { DataContext } from '../../DataContext';
import { Upload, Camera, CheckCircle, XCircle, User, Phone, ShieldCheck, Lock, Zap, X, Key, Copy, Clock } from 'lucide-react';
import './PhotoRecognition.css';

const PLANS = [
    { id: '1_month', label: '1 місяць', price: '199 ₴', days: 30 },
    { id: '3_months', label: '3 місяці', price: '499 ₴', days: 90, popular: true },
    { id: '1_year', label: '1 рік', price: '1499 ₴', days: 365 },
];

const PhotoRecognition = () => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPlans, setShowPlans] = useState(false);
    const [apiKeyResult, setApiKeyResult] = useState(null);
    const [planLoading, setPlanLoading] = useState(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);

    const { userRole } = useContext(DataContext);
    const isStaff = userRole === 'Administrators' || userRole === 'Operators';

    useEffect(() => {
        // Динамічно завантажуємо скрипт WayForPay
        const script = document.createElement("script");
        script.src = "https://secure.wayforpay.com/server/pay-widget.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

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

    const pollPaymentStatus = async (orderRef, retries = 5) => {
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Token ${token}` } : {};
            const res = await axios.get(`http://127.0.0.1:8000/api/payment/status/?order=${orderRef}`, { headers });

            if (res.data.status === 'approved' && res.data.api_key) {
                setApiKeyResult({
                    api_key: res.data.api_key,
                    expires_at: res.data.expires_at
                });
                setPlanLoading(null);
            } else if (retries > 0) {
                setTimeout(() => pollPaymentStatus(orderRef, retries - 1), 2000);
            } else {
                alert("Оплата пройшла, але не вдалося отримати ключ. Перезавантажте сторінку.");
                setPlanLoading(null);
            }
        } catch (err) {
            if (retries > 0) {
                setTimeout(() => pollPaymentStatus(orderRef, retries - 1), 2000);
            } else {
                alert("Помилка перевірки статусу.");
                setPlanLoading(null);
            }
        }
    };

    const handleSelectPlan = async (planId) => {
        setPlanLoading(planId);
        try {
            const token = localStorage.getItem('token');
            const headers = token ? { 'Authorization': `Token ${token}` } : {};

            // 1. Отримуємо дані для підпису від бекенду
            const res = await axios.post('http://127.0.0.1:8000/api/payment/create/', { plan: planId }, { headers });
            const paymentData = res.data;

            // 2. Ініціалізуємо віджет WayForPay
            const wayforpay = new window.Wayforpay();
            wayforpay.run({
                merchantAccount: paymentData.merchantAccount,
                merchantDomainName: paymentData.merchantDomainName,
                authorizationType: "SimpleSignature",
                merchantSignature: paymentData.merchantSignature,
                orderReference: paymentData.orderReference,
                orderDate: paymentData.orderDate,
                amount: paymentData.amount,
                currency: paymentData.currency,
                productName: paymentData.productName,
                productPrice: paymentData.productPrice,
                productCount: paymentData.productCount,
                serviceUrl: paymentData.serviceUrl,
                returnUrl: paymentData.returnUrl
            },
            function (response) {
                // Успішно (Approved)
                console.log("[WFP Approved]", response);
                pollPaymentStatus(paymentData.orderReference);
            },
            function (response) {
                // Відхилено (Declined)
                console.error("[WFP Declined Error Details]:", response);
                alert("Оплату відхилено. Загляньте у консоль браузера (F12) для деталей.");
                setPlanLoading(null);
            },
            function (response) {
                // В очікуванні (Pending)
                console.log("[WFP Pending]", response);
                alert("Оплата в обробці.");
            });

        } catch (err) {
            console.error(err);
            alert("Помилка при ініціалізації оплати.");
            setPlanLoading(null);
        }
    };

    const handleCopyKey = () => {
        if (apiKeyResult?.api_key) {
            navigator.clipboard.writeText(apiKeyResult.api_key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCloseModal = () => {
        setShowPaymentModal(false);
        setShowPlans(false);
        setApiKeyResult(null);
        setCopied(false);
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
                            <button className="btn-secondary" onClick={() => { setPreview(null); setFile(null); setResult(null); }}>
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
                <div className="payment-modal-overlay" onClick={handleCloseModal}>
                    <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={handleCloseModal}>
                            <X size={20} />
                        </button>

                        {/* --- СТАН 3: API-ключ отримано --- */}
                        {apiKeyResult ? (
                            <div className="api-key-success animate-fade-in">
                                <div className="modal-icon-wrapper">
                                    <div className="modal-icon-glow success-glow"></div>
                                    <Key size={40} color="#10b981" />
                                </div>

                                <h2 className="modal-title">API-ключ<br /><span style={{ color: '#10b981' }}>активовано!</span></h2>

                                <p className="modal-description">
                                    Ваш персональний ключ доступу до системи розпізнавання:
                                </p>

                                <div className="api-key-display">
                                    <code className="api-key-value">{apiKeyResult.api_key}</code>
                                    <button className="api-key-copy-btn" onClick={handleCopyKey}>
                                        <Copy size={16} />
                                        {copied ? 'Скопійовано!' : 'Копіювати'}
                                    </button>
                                </div>

                                <div className="api-key-meta">
                                    <div className="api-key-meta-item">
                                        <Clock size={14} color="#94a3b8" />
                                        <span>Дійсний до: {new Date(apiKeyResult.expires_at).toLocaleDateString('uk-UA')}</span>
                                    </div>
                                </div>

                                <button className="modal-buy-btn" onClick={handleCloseModal} style={{ marginTop: '1.2rem' }}>
                                    Почати роботу
                                </button>
                            </div>

                        ) : showPlans ? (
                            /* --- СТАН 2: Вибір тарифу --- */
                            <div className="plans-view animate-fade-in">
                                <div className="modal-icon-wrapper">
                                    <div className="modal-icon-glow"></div>
                                    <ShieldCheck size={40} color="#00BFA5" />
                                </div>

                                <h2 className="modal-title">Оберіть<br /><span>тарифний план</span></h2>

                                <p className="modal-description">
                                    Після вибору плану ви одразу отримаєте API-ключ та необмежений доступ.
                                </p>

                                <div className="plan-cards-container">
                                    {PLANS.map((plan) => (
                                        <button
                                            key={plan.id}
                                            className={`plan-card ${plan.popular ? 'plan-card-popular' : ''}`}
                                            onClick={() => handleSelectPlan(plan.id)}
                                            disabled={planLoading !== null}
                                        >
                                            {plan.popular && <span className="plan-badge">Популярний</span>}
                                            <span className="plan-label">{plan.label}</span>
                                            <span className="plan-price">{plan.price}</span>
                                            <span className="plan-per-day">
                                                {planLoading === plan.id ? 'Обробка...' : `${Math.round(parseInt(plan.price) / plan.days)} ₴/день`}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <button className="modal-cancel-btn" onClick={() => setShowPlans(false)}>
                                    ← Назад
                                </button>
                            </div>

                        ) : (
                            /* --- СТАН 1: Початковий (ліміт вичерпано) --- */
                            <>
                                <div className="modal-icon-wrapper">
                                    <div className="modal-icon-glow"></div>
                                    <Lock size={40} color="#00BFA5" />
                                </div>

                                <h2 className="modal-title">Безкоштовний ліміт<br /><span>вичерпано</span></h2>

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

                                <button className="modal-buy-btn" onClick={() => setShowPlans(true)}>
                                    Оформити
                                </button>

                                <button className="modal-cancel-btn" onClick={handleCloseModal}>
                                    Пізніше
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoRecognition;