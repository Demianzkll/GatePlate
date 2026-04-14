import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2 } from 'lucide-react';
import '../Cars/Vehicles.css';

const Guests = () => {
    const [guests, setGuests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchGuests();
    }, []);

    const fetchGuests = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/guests/');
            setGuests(res.data);
        } catch (err) {
            console.error("Помилка завантаження гостей:", err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Видалити гостьовий пропуск?")) {
            try {
                await axios.delete(`http://127.0.0.1:8000/api/vehicles/${id}/`);
                setGuests(guests.filter(g => g.id !== id));
            } catch (err) {
                console.error("Помилка при видаленні:", err);
            }
        }
    };

    const filteredGuests = guests.filter(g =>
        g.plate_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="archive-container">
            <div className="table-header-actions">
                <h3>Гостьові пропуски</h3>
                <div className="controls-group">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Пошук..."
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="archive-card">
                <table className="archive-table">
                    <thead>
                        <tr>
                            <th>Гість</th>
                            <th>Номерний знак</th>
                            <th>Зареєстрував</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody className="archive-table-body">
                        {filteredGuests.length > 0 ? (
                            filteredGuests.map(guest => (
                                <tr key={guest.id} style={{ cursor: 'default' }}>
                                    <td className="emp-name-bold">{guest.owner_name}</td>
                                    <td>
                                        <span className="plate-badge">
                                            {guest.plate_text.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>{guest.created_by_username || "—"}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="delete-icon"
                                            title="Видалити пропуск"
                                            onClick={() => handleDelete(guest.id)}
                                        >
                                            <Trash2 size={18} color="#00BFA5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    Гостьових пропусків не знайдено
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Guests;
