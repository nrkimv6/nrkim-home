import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  return (
    <nav className={`navigation ${isMenuOpen ? 'open' : ''}`}>
      <button 
        className="hamburger-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="menu-container">
        <Link to="/" className="menu-item">Home</Link>
        
        <div className="menu-item">
          <button 
            className="submenu-button"
            onClick={() => toggleSubmenu('aif')}
          >
            AIF-C01 {openSubmenu === 'aif' ? '▾' : '▸'}
          </button>
          
          <div className={`submenu ${openSubmenu === 'aif' ? 'open' : ''}`}>
            <Link to="/aif-c01/overview">Overview</Link>
            <Link to="/aif-c01/section1">Section 1</Link>
            <Link to="/aif-c01/section2">Section 2</Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 