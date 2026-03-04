import './App.css';
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Employees from './pages/Employees/Employees';
import Archive from './pages/Archive/Archive';
import Home from './pages/Home/Home';
import Vehicles from './pages/Cars/Vehicles'; 
import Login from './pages/Login/Login';
import Signup from './pages/Login/Signup'; 
import GuestRegistration from './pages/Register/GuestRegistration'; 
import { DataProvider } from './DataContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  // Визначаємо роль користувача
  const username = localStorage.getItem('username');
  const userRole = username === 'admin' ? 'admin' : 'guest';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
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

  // Блок для авторизованих користувачів
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
                {/* Адмін бачить повне меню, Гість - тільки реєстрацію свого авто */}
                {userRole === 'admin' ? (
                  <>
                    <NavLink to="/" className="nav-item">Моніторинг</NavLink>
                    <NavLink to="/archive" className="nav-item">Архів</NavLink>
                    <NavLink to="/employees" className="nav-item">Працівники</NavLink>
                    <NavLink to="/vehicles" className="nav-item">Автомобілі</NavLink>
                  </>
                ) : (
                  <NavLink to="/guest-registration" className="nav-item">Мій пропуск</NavLink>
                )}
                
                <button onClick={handleLogout} className="logout-btn">Вийти</button>
              </div>
            </div>
          </nav>

          <main className="content">
            <Routes>
              {/* Автоматичний редирект залежно від ролі при вході на головну */}
              <Route path="/" element={
                userRole === 'admin' ? <Home /> : <Navigate to="/guest-registration" />
              } /> 
              
              {/* Маршрути доступні тільки адміну */}
              {userRole === 'admin' && (
                <>
                  <Route path="/archive" element={<Archive />} /> 
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/vehicles" element={<Vehicles />} />
                </>
              )}

              {/* Маршрут реєстрації авто (доступний всім залогіненим) */}
              <Route path="/guest-registration" element={<GuestRegistration />} />

              {/* Перенаправлення для безпеки */}
              <Route path="/login" element={<Navigate to="/" />} />
              <Route path="/signup" element={<Navigate to="/" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;