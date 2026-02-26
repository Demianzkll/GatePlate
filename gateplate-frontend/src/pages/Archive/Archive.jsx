import { useState, useEffect } from 'react';
import { getDetectedPlates } from '../../services/api'; 

const Archive = () => {
    const [plates, setPlates] = useState([]);

    useEffect(() => {
        const fetchPlates = async () => {
            try {
                const res = await getDetectedPlates();
                setPlates(res.data);
            } catch (err) {
                console.error("Сервер Django не відповідає:", err);
            }
        };

        fetchPlates();
        const timer = setInterval(fetchPlates, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="dashboard-card card">
            <h3>Повний журнал реєстрації</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Номерний знак</th>
                        <th>Час</th>
                        <th>Точність</th>
                        <th>Власник</th>
                    </tr>
                </thead>
                <tbody>
                    {plates.map(plate => (
                        <tr key={plate.id}>
                            <td>{plate.id}</td>
                            <td style={{ fontWeight: 'bold' }}>{plate.plate_text}</td>
                            <td>{new Date(plate.timestamp).toLocaleString()}</td>
                            <td>{(plate.confidence * 100).toFixed(1)}%</td>
                            {/* Перевіряємо наявність об'єкта vehicle, який ми додали в БД */}
                            <td className={plate.vehicle ? 'allowed' : 'denied'}>
                                {plate.vehicle 
                                    ? `ПРАЦІВНИК: ${plate.vehicle.employee_name}` 
                                    : 'НЕВІДОМИЙ'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Archive;