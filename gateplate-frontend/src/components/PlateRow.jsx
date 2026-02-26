
const PlateRow = ({ plate }) => {
    // Визначаємо колір статусу
    const statusColor = plate.is_allowed ? '#4caf50' : '#f44336';

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px', 
            borderBottom: '1px solid #333',
            background: '#1e1e1e',
            marginBottom: '5px'
        }}>
            <div style={{ flex: 1, fontWeight: 'bold', color: '#fff' }}>
                {plate.plate_text}
            </div>
            <div style={{ flex: 1, color: '#aaa' }}>
                {new Date(plate.timestamp).toLocaleTimeString()}
            </div>
            <div style={{ 
                flex: 1, 
                color: statusColor, 
                fontWeight: 'bold' 
            }}>
                {plate.is_allowed ? 'ДОЗВОЛЕНО' : 'НЕВІДОМИЙ'}
            </div>
        </div>
    );
};

export default PlateRow;