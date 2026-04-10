 import React, { useContext, useEffect, useState, useRef } from 'react';
import { DataContext } from '../../DataContext';
import axios from 'axios';
import './Home.css';


const Home = () => {

  const {

    selectedVideo, setSelectedVideo,

    lastDetection, setLastDetection,

    livePlate, setLivePlate,

    fetchLastDetection

  } = useContext(DataContext);


  // Локальні стани для редагування та інтерфейсу

  const [editMode, setEditMode] = useState(false);
  const [tempPlate, setTempPlate] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const videoOptions = [
    { value: '', label: 'Оберіть джерело відео' },
    { value: 'video1.mp4', label: 'Потік №1' },
    { value: 'video2.mp4', label: 'Потік №2' },
    { value: 'video3.mp4', label: 'Потік №3' },
    { value: 'video4.mp4', label: 'Потік №4' },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // 1. Опитування Бази Даних для історії (раз на 3 сек)

  useEffect(() => {

    fetchLastDetection();

    const timer = setInterval(fetchLastDetection, 3000);

    return () => clearInterval(timer);

  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // 2. Опитування "Живого" потоку AI-аналітики

  useEffect(() => {

    if (!selectedVideo) {

      setLivePlate(null);

      setEditMode(false);

      return;

    }


    const fetchLive = async () => {

      try {

        const res = await axios.get(`http://127.0.0.1:8000/api/live-update/?video=${selectedVideo}`);

       

        if (res.data) {

          setLivePlate(res.data);

         

          // Якщо AI потребує втручання і ми ще не в режимі редагування

          if (res.data.needs_confirmation && !editMode) {

            setEditMode(true);

            setTempPlate(res.data.plate);

          }

        } else if (!editMode) {

          setLivePlate(null);

        }

      } catch (err) {

        console.error("Помилка Live-потоку:", err);

      }

    };


    const liveTimer = setInterval(fetchLive, 800);

    return () => clearInterval(liveTimer);

  }, [selectedVideo, editMode, setLivePlate]);


  // ДІЯ: Підтвердження пропуску (для гостей або заблокованих вручну)

  const handleManualConfirm = async () => {

    try {

      await axios.post('http://127.0.0.1:8000/api/confirm-plate/', {

        plate: tempPlate,

        video_name: selectedVideo,

        conf: livePlate?.conf || 0

      });

      setEditMode(false);

      setLivePlate(null);

      fetchLastDetection();

    } catch (err) {

      console.error("Помилка підтвердження:", err);

    }

  };


  // ДІЯ: Зміна глобального статусу (Чорний список)

  const handleStatusUpdate = async (action) => {

    try {

      await axios.post('http://127.0.0.1:8000/api/update-status/', {

        plate: tempPlate || livePlate?.plate,

        action: action // 'to_black' або 'to_white'

      });

      // Після зміни статусу можна або скинути прев'ю, або почекати нового циклу

      alert(action === 'to_black' ? "Об'єкт внесено в чорний список" : "Об'єкт видалено з чорного списку");

      if (action === 'to_black') {

          setEditMode(false);

          setLivePlate(null);

      }

    } catch (err) {

      console.error("Помилка зміни статусу:", err);

    }

  };


  const handleVideoChange = (e) => {

    setSelectedVideo(e.target.value);

    setLivePlate(null);

    setEditMode(false);

  };


  // Функція для визначення стилю картки аналізу

  const getAnalysisStyle = () => {

    if (!livePlate) return {};

    if (livePlate.access_type === 'blocked') return { borderLeft: '5px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)' };

    if (livePlate.access_type === 'guest') return { borderLeft: '5px solid #f59e0b', background: 'rgba(245, 158, 11, 0.1)' };

    return { borderLeft: '5px solid #3b82f6', background: 'rgba(59, 130, 246, 0.1)' };

  };


  return (

    <div className="home-container">

      <div className="dashboard-grid">

       

        {/* СЕКЦІЯ ВІДЕОПОТОКУ */}

        <section className="video-section card">

          <h3 style={{ textAlign: 'left', marginBottom: '15px' }}>Моніторинг в'їзду</h3>

         

          <div className="video-wrapper" style={{ minHeight: '350px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>

              {selectedVideo ? (

                <video

                  key={selectedVideo}

                  controls autoPlay muted crossOrigin="anonymous"

                  style={{ width: '100%', display: 'block' }}

                  onPlay={() => {

                    axios.get(`http://127.0.0.1:8000/api/start-analysis/?video=${selectedVideo}`);

                  }}

                >

                  <source src={`http://127.0.0.1:8000/media/${selectedVideo}`} type="video/mp4" />

                </video>

              ) : (

                <div className="video-placeholder" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px', color: '#64748b' }}>

                  <p>Оберіть джерело відео для запуску AI-аналізу</p>

                </div>

              )}

            </div>

          <div className="source-selector" ref={dropdownRef}>
            <label className="source-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
              Джерело відео
            </label>

            <button
              className={`custom-select-trigger ${dropdownOpen ? 'open' : ''} ${selectedVideo ? 'has-value' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              type="button"
            >
              <span className="select-value">
                {selectedVideo
                  ? videoOptions.find(o => o.value === selectedVideo)?.label
                  : 'Оберіть джерело відео'
                }
              </span>
              <span className={`select-arrow ${dropdownOpen ? 'rotated' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>

            {dropdownOpen && (
              <div className="custom-select-menu">
                {videoOptions.filter(o => o.value !== '').map((option) => (
                  <div
                    key={option.value}
                    className={`custom-select-option ${selectedVideo === option.value ? 'selected' : ''}`}
                    onClick={() => {
                      handleVideoChange({ target: { value: option.value } });
                      setDropdownOpen(false);
                    }}
                  >
                    <span className="option-dot"></span>
                    <span className="option-label">{option.label}</span>
                    {selectedVideo === option.value && (
                      <svg className="option-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00BFA5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>


          {/* ІНТЕРФЕЙС РОЗПІЗНАННЯ ТА КЕРУВАННЯ */}

          <div className="owner-info-display" style={{ marginTop: '25px', textAlign: 'left' }}>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', minHeight: '100px', padding: '15px', borderRadius: '12px', ...getAnalysisStyle() }}>

             

              {editMode ? (

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>

                    <input

                      className="plate-badge"

                      value={tempPlate}

                      onChange={(e) => setTempPlate(e.target.value.toUpperCase())}

                      style={{ background: '#fff', color: '#000', width: '180px', textAlign: 'center', fontSize: '1.4rem' }}

                    />

                    <div style={{ flex: 1 }}>

                      <p style={{ color: livePlate?.access_type === 'blocked' ? '#ef4444' : '#eab308', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>

                        ● {livePlate?.message || "ПОТРЕБУЄ ПЕРЕВІРКИ"}

                      </p>

                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Точність AI: {(livePlate?.conf * 100).toFixed(0)}%</p>

                    </div>

                  </div>

                 

                  <div style={{ display: 'flex', gap: '10px' }}>

                    <button onClick={handleManualConfirm} className="btn" style={{ background: '#10b981', color: '#fff', fontWeight: 'bold' }}>

                      ПРОПУСТИТИ ТА ЗБЕРЕГТИ

                    </button>

                    {livePlate?.access_type === 'blocked' ? (

                      <button onClick={() => handleStatusUpdate('to_white')} className="btn" style={{ background: '#3b82f6', color: '#fff' }}>

                        ВИДАЛИТИ З ЧОРНОГО СПИСКУ

                      </button>

                    ) : (

                      <button onClick={() => handleStatusUpdate('to_black')} className="btn" style={{ background: '#ef4444', color: '#fff' }}>

                        В ЧОРНИЙ СПИСОК

                      </button>

                    )}

                  </div>

                </div>

              ) : (

                <>

                  <div className="plate-badge" style={{

                    borderColor: livePlate ? '#3b82f6' : '#475569',

                    color: livePlate ? '#fff' : '#cbd5e1',

                    fontSize: '1.4rem'

                  }}>

                    {livePlate ? livePlate.plate : (lastDetection ? lastDetection.plate_text : "---")}

                  </div>

                  <div>

                    {livePlate ? (

                      <p style={{ color: '#3b82f6', fontWeight: 'bold', margin: 0 }}>● АНАЛІЗУЮ ПОТІК...</p>

                    ) : lastDetection ? (

                      <p className={lastDetection.vehicle ? "allowed" : "denied"} style={{ fontWeight: 'bold', margin: 0 }}>

                        ● {lastDetection.vehicle ? "ВЕРИФІКОВАНО (АВТОМАТИЧНО)" : "ОБРОБЛЕНО ВРУЧНУ"}

                      </p>

                    ) : (

                      <p style={{ color: '#64748b', margin: 0 }}>Очікування даних...</p>

                    )}

                  </div>

                </>

              )}

            </div>

          </div>

        </section>


        <aside className="stats-section">

          {/* КАРТКА №1: СТАН ОБЛАДНАННЯ */}

          <div className="card" style={{ textAlign: 'left', marginBottom: '20px' }}>

            <h4 style={{ marginBottom: '10px', color: '#94a3b8' }}>Статус системи:</h4>

            <p style={{ margin: '5px 0' }}>Джерело: <strong>{selectedVideo || "Не обрано"}</strong></p>

            <p style={{ margin: '5px 0' }}>Стан:

              <span style={{

                marginLeft: '8px',

                color: selectedVideo ? '#10b981' : '#ef4444',

                fontWeight: 'bold'

              }}>

                ● {selectedVideo ? "ONLINE" : "OFFLINE"}

              </span>

            </p>

          </div>


          {/* КАРТКА №2: ДАНІ ВЛАСНИКА */}

          <div className="card" style={{ 
  textAlign: 'left', 
  minHeight: '220px', 
  background: '#1E2A38', 
  border: '1px solid rgba(0, 191, 165, 0.2)' 
}}>
  <h4 style={{ color: '#ababab', marginBottom: '15px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
    Інформація про власника
  </h4>

  {lastDetection?.vehicle ? (
    <div className="owner-data animate-fade-in">
      {/* Горизонтальний layout: фото зліва, інфо праворуч */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        marginBottom: '12px'
      }}>
        {/* Аватар */}
        <div style={{ 
          width: '64px', 
          height: '64px', 
          minWidth: '64px',
          background: '#0f172a', 
          borderRadius: '50%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          overflow: 'hidden',
          border: '2px solid #00BFA5',
          boxShadow: '0 0 12px rgba(0, 191, 165, 0.2)'
        }}>
          {lastDetection.vehicle.employee?.photo ? (
            <img 
              src={`http://127.0.0.1:8000${lastDetection.vehicle.employee.photo}`} 
              alt="Owner" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          ) : (
            <span style={{ fontSize: '1.6rem' }}>👤</span>
          )}
        </div>

        {/* Ім'я та телефон */}
        <div>
          <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#fff' }}>
            {lastDetection.vehicle.owner_name}
          </p>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            color: '#00BFA5', 
            fontSize: '0.88rem' 
          }}>
            <svg 
              width="14" height="14" viewBox="0 0 24 24" fill="none" 
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span style={{ fontWeight: '600', letterSpacing: '0.3px' }}>
              {lastDetection.vehicle.employee?.phone || lastDetection.vehicle.owner_phone || "Не вказано"}
            </span>
          </div>
        </div>
      </div>

      <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.82rem', margin: '8px 0' }}>
        ● ДОСТУП ДОЗВОЛЕНО
      </p>

      <hr style={{ borderColor: 'rgba(51, 65, 85, 0.5)', margin: '12px 0' }} />

      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
        <p style={{ marginBottom: '4px' }}>
          <strong>Посада:</strong> {lastDetection.vehicle.employee?.position || "Відвідувач"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Авто:</strong> {lastDetection.vehicle.brand_model || "Зареєстровано"}
        </p>
      </div>
    </div>
  ) : (
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <div className="plate-badge" style={{ 
        margin: '0 auto 10px', 
        background: '#334155', 
        fontSize: '1.1rem',
        border: '2px solid #ef4444' 
      }}>
        {lastDetection ? lastDetection.plate_text : "---"}
      </div>
      <p style={{ color: '#ef4444', fontWeight: 'bold' }}>● НЕВІДОМИЙ ОБ'ЄКТ</p>
      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>
        Відсутній у базі даних GatePlate.
      </p>
    </div>
  )}
</div>

        </aside>

      </div>

    </div>

  );

};


export default Home;

