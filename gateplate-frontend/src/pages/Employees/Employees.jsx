import React, { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import axios from 'axios';
import './Employees.css';

const Employees = () => {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]); 
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentEmp, setCurrentEmp] = useState(null);
    
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', parent_dept: '', department: '', phone: ''
    });

    useEffect(() => { 
        fetchEmployees();
        fetchDepartments();
    }, []);

    const fetchEmployees = async () => {
        const res = await axios.get('http://127.0.0.1:8000/api/employees/');
        setEmployees(res.data);
    };

    const fetchDepartments = async () => {
        const res = await axios.get('http://127.0.0.1:8000/api/departments/');
        setDepartments(res.data);
    };


    const handleDelete = async (e, id) => {
    e.stopPropagation(); // Щоб не розгортався рядок
    if (window.confirm("Ви впевнені, що хочете видалити цього працівника?")) {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/employees/${id}/`);
            fetchEmployees(); // Оновлюємо список
        } catch (err) {
            console.error("Помилка видалення:", err);
        }
    }
};

    // Фільтруємо підрозділи для другого селекту
    const availableSubDepts = departments.filter(d => d.parent === parseInt(formData.parent_dept));

    // Додай це у функцію handleOpenModal, щоб скидати вибране фото при відкритті
    const handleOpenModal = (emp = null) => {
        setCurrentEmp(emp);
        if (emp) {
            // Знаходимо головний підрозділ за назвою (шукаємо той, у кого немає parent)
            const rootDeptObj = departments.find(d => d.name === emp.root_department && !d.parent);
            
            // Знаходимо специфічний відділ
            const specificDeptObj = departments.find(d => d.name === emp.specific_department);

            setFormData({
                first_name: emp.first_name,
                last_name: emp.last_name,
                // Перетворюємо ID на рядок для коректної роботи <select>
                parent_dept: rootDeptObj ? rootDeptObj.id.toString() : '',
                // Якщо відділ такий самий як підрозділ — залишаємо селект відділу порожнім
                department: (specificDeptObj && specificDeptObj.id !== rootDeptObj?.id) 
                    ? specificDeptObj.id.toString() 
                    : '',
                phone: emp.phone || '',
                photo: null
            });
        } else {
            setFormData({ first_name: '', last_name: '', parent_dept: '', department: '', phone: '', photo: null });
        }
        setIsModalOpen(true);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        data.append('first_name', formData.first_name);
        data.append('last_name', formData.last_name);
        data.append('phone', formData.phone);
        
        // Пріоритет: ID відділу, а якщо його немає — ID головного підрозділу
        const finalDeptId = formData.department || formData.parent_dept;
        data.append('department', finalDeptId);

        // Додаємо фото, якщо воно було вибране
        if (formData.photo instanceof File) {
            data.append('photo', formData.photo);
        }

        try {
            const url = currentEmp 
                ? `http://127.0.0.1:8000/api/employees/${currentEmp.id}/`
                : 'http://127.0.0.1:8000/api/employees/';
            
            await axios({
                method: currentEmp ? 'put' : 'post',
                url: url,
                data: data,
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsModalOpen(false);
            fetchEmployees();
        } catch (err) {
            console.error("Помилка при збереженні:", err.response?.data);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        `${emp.first_name} ${emp.last_name} ${emp.root_department} ${emp.phone}`
        .toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="archive-container">
            <div className="table-header-actions">
                <h3>База працівників</h3>
                <div className="controls-group">
                    <input type="text" placeholder="Пошук..." className="search-input" onChange={(e) => setSearchTerm(e.target.value)} />
                    <button className="add-btn" onClick={() => handleOpenModal()}>+ Додати</button>
                </div>
            </div>

            <div className="archive-card">
                <table className="archive-table">
                    <thead>
                        <tr>
                            <th>Фото</th>
                            <th>Прізвище та Ім'я</th>
                            <th>Основний підрозділ</th>
                            <th>Телефон</th>
                            <th>Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(emp => (
                            <React.Fragment key={emp.id}>
                                <tr onClick={() => {
                                    // Розгортаємо ТІЛЬКИ якщо є реальна вкладеність (назви різні)
                                    if (emp.specific_department && emp.specific_department !== emp.root_department) {
                                        setExpandedId(expandedId === emp.id ? null : emp.id);
                                    }
                                }}>
                                    <td>
                                        <div className="avatar-circle">
                                            {emp.photo ? <img src={emp.photo} alt="👤" className="employee-photo-img" /> : "👤"}
                                        </div>
                                    </td>
                                    <td className="emp-name-bold">{emp.last_name} {emp.first_name}</td>

                                    <td>
                                        <span className="dept-badge">
                                            {/* Якщо specific і root однакові, показуємо root і НЕ малюємо трикутник */}
                                            {emp.root_department || emp.specific_department}
                                            
                                            {/* Показуємо трикутник ТІЛЬКИ якщо є вкладеність з іншою назвою */}
                                            {emp.specific_department && emp.specific_department !== emp.root_department && (
                                                <span className={`arrow-indicator ${expandedId === emp.id ? 'open' : ''}`}>
                                                    {expandedId === emp.id ? '▲' : '▼'}
                                                </span>
                                            )}
                                        </span>
                                    </td>

                                    <td className="phone-cell">{emp.phone || "—"}</td>
                                    <td className="actions-cell">
                                        <button className="edit-icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(emp); }}>
                                            <Pencil size={18} color="#00BFA5" />
                                        </button>
                                        <button className="delete-icon" onClick={(e) => handleDelete(e, emp.id)}>
                                            <Trash2 size={18} color="#00BFA5" />
                                        </button>
                                    </td>
                                </tr>

                                {/* Рядок з деталями теж рендеримо тільки якщо є що показувати */}
                                {expandedId === emp.id && emp.specific_department && emp.specific_department !== emp.root_department && (
                                    <tr className="detail-row">
                                        <td colSpan="5">
                                            <div className="detail-content">
                                                <span className="detail-label">Відділ:</span>
                                                <span>{emp.specific_department}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{currentEmp ? 'Редагувати' : 'Новий працівник'}</h3>
                        <form onSubmit={handleSubmit}>
                            <input type="text" placeholder="Ім'я" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} required />
                            <input type="text" placeholder="Прізвище" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} required />
                            
                            {/* 1. Головний підрозділ */}
                            <select 
                                value={formData.parent_dept} 
                                onChange={e => setFormData({...formData, parent_dept: e.target.value, department: ''})} 
                                required
                            >
                                <option value="">Оберіть основний підрозділ</option>
                                {departments
                                    .filter(d => !d.parent)
                                    .map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))
                                }
                            </select>

                            {/* 2. Конкретний відділ */}
                            <select 
                                value={formData.department} 
                                onChange={e => setFormData({...formData, department: e.target.value})} 
                                disabled={!formData.parent_dept}
                            >
                                <option value="">Оберіть відділ (необов'язково)</option>
                                {departments
                                    .filter(d => d.parent === parseInt(formData.parent_dept))
                                    .map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))
                                }
                            </select>
                            <input 
                                type="text" 
                                placeholder="Телефон" 
                                value={formData.phone} 
                                onChange={e => setFormData({...formData, phone: e.target.value})} 
                            />

                            <div className="file-input-container">
                                <label className="file-label">Фото працівника (необов'язково):</label>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={e => setFormData({...formData, photo: e.target.files[0]})} 
                                    className="file-input"
                                />
                            </div>

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

export default Employees;