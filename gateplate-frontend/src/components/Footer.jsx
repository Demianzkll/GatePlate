import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-glow"></div>
      <div className="footer-container">
        
        {/* Верхня частина */}
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="GatePlate Logo" />
              <h3>Gate<span>Plate</span></h3>
            </div>
            <p className="footer-description">
              Інтелектуальна система контролю доступу транспорту з розпізнаванням номерних знаків на базі ШІ.
            </p>
          </div>

          <div className="footer-links-group">
            <h4>Система</h4>
            <ul>
              <li>Моніторинг в реальному часі</li>
              <li>Розпізнавання номерів</li>
              <li>Управління доступом</li>
              <li>Архів фіксацій</li>
            </ul>
          </div>

          <div className="footer-links-group">
            <h4>Технології</h4>
            <ul>
              <li>YOLOv8 + Tesseract OCR</li>
              <li>Django REST Framework</li>
              <li>React.js</li>
              <li>Computer Vision</li>
            </ul>
          </div>
        </div>

        {/* Розділювач */}
        <div className="footer-divider"></div>

        {/* Нижня частина */}
        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} <strong>GatePlate</strong>. Всі права захищено.
          </p>
          <div className="footer-badge">
            <span className="badge-dot"></span>
            Система працює
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
