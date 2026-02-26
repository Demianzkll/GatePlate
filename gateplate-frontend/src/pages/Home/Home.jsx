 import React, { useContext, useEffect, useState } from 'react';

import { DataContext } from '../../DataContext';

import axios from 'axios';


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


          <div className="admin-controls" style={{ marginTop: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>

            <label style={{ color: '#ababab' }}>Джерело:</label>

            <select

              className="btn"

              value={selectedVideo}

              onChange={handleVideoChange}

              style={{ background: '#1e293b', color: 'white', padding: '8px 15px' }}

            >

              <option value="">--- Оберіть відео ---</option>
              <option value="video1.mp4">Потік №1</option>
              <option value="video2.mp4">Потік №2</option>
              <option value="video3.mp4">Потік №3</option>
              <option value="video4.mp4">Потік №4</option>

            </select>

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

          <div className="card" style={{ textAlign: 'center', minHeight: '220px' }}>

            <h4 style={{ color: '#ababab', marginBottom: '15px' }}>Інформація про власника:</h4>

           

            {lastDetection?.vehicle?.employee ? (

              <div className="owner-data animate-fade-in">

                <div style={{ width: '60px', height: '60px', background: '#1e293b', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.5rem', border: '2px solid #3b82f6' }}>

                  👤

                </div>

                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '5px 0', color: '#f8fafc' }}>

                  {lastDetection.vehicle.employee.first_name} {lastDetection.vehicle.employee.last_name}

                </p>

                <p style={{ color: '#3b82f6', fontSize: '0.9rem', margin: '2px 0' }}>

                  📞 {lastDetection.vehicle.employee.phone || "Не вказано"}

                </p>

                <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '5px' }}>

                  ● ДОСТУП ДОЗВОЛЕНО

                </p>

                <hr style={{ borderColor: '#334155', margin: '10px 0' }} />

                <div style={{ textAlign: 'left', fontSize: '0.8rem', color: '#94a3b8' }}>

                  <p>Посада: {lastDetection.vehicle.employee.position || "Співробітник"}</p>

                  <p>Авто: {lastDetection.vehicle.model || "Зареєстровано"}</p>

                </div>

              </div>

            ) : (

              <div style={{ marginTop: '30px' }}>

                <div className="plate-badge" style={{ margin: '0 auto 10px', background: '#334155', fontSize: '1.1rem' }}>

                  {lastDetection ? lastDetection.plate_text : "---"}

                </div>

                <p style={{ color: '#ef4444', fontWeight: 'bold' }}>● НЕВІДОМИЙ ОБ'ЄКТ</p>

                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>

                  Відсутній у базі співробітників.

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

