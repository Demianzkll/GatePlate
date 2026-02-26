import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/vehicles/');
            setVehicles(res.data);
        } catch (err) {
            console.error("Помилка завантаження авто:", err);
        }
    };

    // Фільтрація за номером або ім'ям власника
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
                    {/* Робимо структуру 1-в-1 як у працівників */}
                    <button className="add-btn" onClick={() => handleOpenVehicleModal()}>
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
                            <th>Підрозділ</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVehicles.map(vehicle => (
                            <tr key={vehicle.id} style={{ cursor: 'default' }}>
                                <td className="emp-name-bold">{vehicle.owner_name}</td>
                                <td>
                                    <span className="plate-badge">
                                        {vehicle.plate_text.toUpperCase()}
                                    </span>
                                </td>
                                <td>{vehicle.brand_model || "—"}</td>
                                <td>{vehicle.owner_dept}</td>
                                <td className="actions-cell">
                                    <button className="edit-icon">
                                        <Pencil size={18} color="#00BFA5" />
                                    </button>
                                    <button className="delete-icon">
                                        <Trash2 size={18} color="#00BFA5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Vehicles;