import './App.css';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Employees from './pages/Employees/Employees';
import Archive from './pages/Archive/Archive';
import Home from './pages/Home/Home';
import Vehicles from './pages/Cars/Vehicles'; 
import Login from './pages/Login/Login';
import Signup from './pages/Login/Signup'; 
import GuestRegistration from './pages/RegisterCar/GuestRegistration';
import PhotoRecognition from './pages/PhotoRecognition/PhotoRecognition';
import Guests from './pages/Guests/Guests'; 
import SystemStatus from './pages/SystemStatus/SystemStatus';
import { DataProvider } from './DataContext';
import Footer from './components/Footer';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  // Отримуємо роль прямо з localStorage
  const role = localStorage.getItem('role'); 

  // Визначаємо права доступу
  const isAdmin = role === 'Administrators';
  const isOperator = role === 'Operators';
  const isStaff = isAdmin || isOperator; 

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setIsAuthenticated(false);
  };

  // Блок для неавторизованих користувачів
  if (!isAuthenticated) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="/signup" element={<Signup />} /> {/* Шлях для створення акаунта */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    );
  }

  return (
    <DataProvider>
      <Router>
        <div className="App">
          <nav className="navbar">
            <div className="nav-container">
              <Link to="/" className="logo-link">
                <div className="logo">
                  <img src="/logo.png" alt="Logo" />
                  <h1>Gate<span>Plate</span></h1>
                </div>
              </Link>

              <div className="nav-buttons">
                {isStaff ? (
                  <>
                    <NavLink to="/" className="nav-item">Моніторинг</NavLink>
                    <NavLink to="/photo-analysis" className="nav-item">Розпізнати фото</NavLink>
                    <NavLink to="/archive" className="nav-item">Архів</NavLink>
                    {isAdmin && <NavLink to="/employees" className="nav-item">Працівники</NavLink>}
                    <NavLink to="/vehicles" className="nav-item">Автомобілі</NavLink>
                    <NavLink to="/guests" className="nav-item">Гості</NavLink>
                    {isAdmin && <NavLink to="/status" className="nav-item">Монітор</NavLink>}
                  </>
                ) : (
                  <>
                    <NavLink to="/guest-registration" className="nav-item">Мій пропуск</NavLink>
                    <NavLink to="/photo-analysis" className="nav-item">Фото аналіз</NavLink>
                  </>
                )}
                
                <button onClick={handleLogout} className="logout-btn">Вийти</button>
              </div>
            </div>
          </nav>

          <main className="content">
            <Routes>
              <Route path="/" element={
                isStaff ? <Home /> : <Navigate to="/guest-registration" />
              } />

                <Route path="/photo-analysis" element={<PhotoRecognition/>} /> 
                
                {/* Спільні маршрути */}
                {isStaff && (
                  <>
                    <Route path="/archive" element={<Archive />} />
                    {/* Сторінка авто однакова для обох, але всередині Vehicles ми зробимо перевірку на роль */}
                    <Route path="/vehicles" element={<Vehicles isAdmin={isAdmin} />} />
                    <Route path="/guests" element={<Guests />} />
                    {isAdmin && <Route path="/status" element={<SystemStatus />} />}
                  </>
                )}

                {/* Тільки для Адміна */}
                {isAdmin && (
                  <Route path="/employees" element={<Employees />} />
                )}

                {/* Для Гостей */}
                <Route path="/guest-registration" element={<GuestRegistration />} />

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;