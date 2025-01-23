import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { aifRoutes } from '../routes';
import './AIFNavigation.css';

const AIFNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className={`aif-navigation ${isMenuOpen ? 'open' : ''}`}>
      <button 
        className="hamburger-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="menu-container">
        {aifRoutes
          .filter(route => route.visible)
          .map((route) => (
            <Link
              key={route.path}
              to={route.path}
              className={`menu-item ${location.pathname === route.path ? 'active' : ''}`}
            >
              {route.title}
            </Link>
          ))}
      </div>
    </nav>
  );
};

export default AIFNavigation; 