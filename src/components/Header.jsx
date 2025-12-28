import React, { useState, useEffect } from 'react';
import './Header.css';

function Header({ onNavClick, searchValue, onSearchChange }) {
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileNav(false);
    }
  }, [isMobile]);

  const handleHomeClick = () => {
    if (isMobile) {
      setShowMobileNav((prev) => !prev);
    }
    onNavClick('home');
  };

  const handleNavClick = (section) => {
    onNavClick(section);
    if (isMobile) {
      setShowMobileNav(false);
    }
  };

  return (
    <div className="header">
      <h1 className="header__logo">NIGHTFALL</h1>
      <div className="header__mobile-icons">
        <button className="header__icon" onClick={handleHomeClick} title="Home">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
        </button>
        <button className="header__icon" onClick={() => setShowSearch(!showSearch)} title="Search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
      <div className={`header__nav${showMobileNav ? ' header__nav--active' : ''}`}>
        <button onClick={() => handleNavClick('home')}>Home</button>
        <button onClick={() => handleNavClick('tvshows')}>TV Shows</button>
        <button onClick={() => handleNavClick('movies')}>Movies</button>
        <button onClick={() => handleNavClick('new')}>New & Popular</button>
        <button onClick={() => handleNavClick('mylist')}>My List</button>
        <button onClick={() => handleNavClick('addmovie')}>Add Movie</button>
      </div>
      <div className="header__right">
        {(!isMobile || showSearch) && (
          <input
            type="text"
            placeholder="Search"
            className="header__search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

export default Header;
