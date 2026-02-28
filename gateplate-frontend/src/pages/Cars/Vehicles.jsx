import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Plus } from 'lucide-react';
import './Vehicles.css';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [employees, setEmployees] = useState([]); // Для випадаючого списку
    const [searchTerm, setSearchTerm] = useState('');
    
    // Стан для модального вікна
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        employee: '',
        plate_text: '',
        brand_model: ''
    });

    useEffect(() => {
        fetchVehicles();
        fetchEmployees();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/vehicles/');
            setVehicles(res.data);
        } catch (err) {
            console.error("Помилка завантаження авто:", err);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/employees/'); // Переконайся, що шлях вірний
            setEmployees(res.data);
        } catch (err) {
            console.error("Помилка завантаження працівників:", err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Ви впевнені, що хочете видалити цей автомобіль?")) {
            try {
                await axios.delete(`http://127.0.0.1:8000/api/vehicles/${id}/`);
                setVehicles(vehicles.filter(v => v.id !== id));
            } catch (err) {
                console.error("Помилка при видаленні:", err);
            }
        }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://127.0.0.1:8000/api/vehicles/', formData);
            setVehicles([...vehicles, res.data]);
            setIsModalOpen(false);
            setFormData({ employee: '', plate_text: '', brand_model: '' });
            fetchVehicles(); // Перевантажуємо для отримання owner_name від серіалайзера
        } catch (err) {
            console.error("Помилка при додаванні:", err);
            alert("Помилка при додаванні. Перевірте правильність даних.");
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        v.plate_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="archive-container">
            <div className="table-header-actions">
                <h3>Реєстр авто</h3>
                <div className="controls-group">
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Пошук..." 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <button className="add-btn" onClick={() => setIsModalOpen(true)}>
                        + Додати
                    </button>
                </div>
            </div>

            <div className="archive-card">
                <table className="archive-table">
                    <thead>
                        <tr>
                            <th>Власник</th>
                            <th>Номерний знак</th>
                            <th>Марка / Модель</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody className="archive-table-body">
                        {filteredVehicles.length > 0 ? (
                            filteredVehicles.map(vehicle => (
                                <tr key={vehicle.id} style={{ cursor: 'default' }}>
                                    <td className="emp-name-bold">{vehicle.owner_name}</td>
                                    <td>
                                        <span className="plate-badge">
                                            {vehicle.plate_text.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{vehicle.brand_model || "—"}</td>
                                    <td className="actions-cell">
                                        <button className="edit-icon" title="Редагувати">
                                            <Pencil size={18} color="#00BFA5" />
                                        </button>
                                        <button 
                                            className="delete-icon" 
                                            title="Видалити"
                                            onClick={() => handleDelete(vehicle.id)}
                                        >
                                            <Trash2 size={18} color="#00BFA5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    Автомобілів не знайдено
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Модальне вікно додавання авто */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Додати автомобіль</h3>
                        <form onSubmit={handleAddVehicle}>
                            <select 
                                required 
                                value={formData.employee}
                                onChange={(e) => setFormData({...formData, employee: e.target.value})}
                            >
                                <option value="">Оберіть власника...</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name}
                                    </option>
                                ))}
                            </select>
                            <input 
                                type="text"
                                placeholder="Номерний знак"
                                required
                                value={formData.plate_text}
                                onChange={(e) => setFormData({...formData, plate_text: e.target.value})}
                            />
                            <input 
                                type="text"
                                placeholder="Марка / Модель"
                                value={formData.brand_model}
                                onChange={(e) => setFormData({...formData, brand_model: e.target.value})}
                            />
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Скасувати</button>
                                <button type="submit" className="save-btn">Зберегти</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vehicles;