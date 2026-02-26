import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
    // Глобальні стани, які будуть жити вічно (поки відкрита вкладка)
    const [selectedVideo, setSelectedVideo] = useState("");
    const [lastDetection, setLastDetection] = useState(null);
    const [livePlate, setLivePlate] = useState(null);

    // Функція оновлення останньої детекції (можна викликати з будь-якої сторінки)
    const fetchLastDetection = async () => {
        try {
            const res = await axios.get('http://127.0.0.1:8000/api/detected-plates/');
            if (res.data.length > 0) {
                setLastDetection(res.data[0]);
            }
        } catch (err) {
            console.error("Помилка Context БД:", err);
        }
    };

    return (
        <DataContext.Provider value={{ 
            selectedVideo, setSelectedVideo, 
            lastDetection, setLastDetection,
            livePlate, setLivePlate,
            fetchLastDetection
        }}>
            {children}
        </DataContext.Provider>
    );
};