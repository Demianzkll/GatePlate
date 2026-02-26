import './App.css';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import Employees from './pages/Employees/Employees';
import Archive from './pages/Archive/Archive';
import Home from './pages/Home/Home';
import Vehicles from './pages/Cars/Vehicles'; 
import { DataProvider } from './DataContext';

function App() {
  return (
    <DataProvider>
      <Router>
        <div className="App">
          <nav className="navbar">
            <div className="nav-container">
              {/* Лого залишаємо звичайним Link, щоб воно не підсвічувалося як кнопка */}
              <Link to="/" className="logo-link">
                <div className="logo">
                  <img src="/logo.png" alt="Logo" />
                  <h1>Gate<span>Plate</span></h1>
                </div>
              </Link>

              <div className="nav-buttons">
                <NavLink to="/" className="nav-item">Моніторинг</NavLink>
                <NavLink to="/archive" className="nav-item">Архів</NavLink>
                <NavLink to="/employees" className="nav-item">Працівники</NavLink>
                {/* Нова кнопка для переходу до реєстру автомобілів */}
                <NavLink to="/vehicles" className="nav-item">Автомобілі</NavLink>
              </div>
            </div>
          </nav>

          <main className="content">
            <Routes>
              {/* Головна сторінка: відео та статистика */}
              <Route path="/" element={<Home />} /> 
              
              {/* Архів в'їздів */}
              <Route path="/archive" element={<Archive />} /> 
              
              {/* Управління персоналом */}
              <Route path="/employees" element={<Employees />} />
              
              {/* Новий маршрут для реєстру автомобілів з прив'язкою до працівників */}
              <Route path="/vehicles" element={<Vehicles />} />
            </Routes>
          </main>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;