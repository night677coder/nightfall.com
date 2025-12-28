import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <div className="footer">
      <p className="footer__text">
        &copy; 2025 NIGHTFALL. All rights reserved.
        <a href="#" className="footer__link">Privacy</a>
        <span className="footer__separator">|</span>
        <a href="#" className="footer__link">Terms</a>
        <span className="footer__separator">|</span>
        <a href="#" className="footer__link">Contact</a>
      </p>
    </div>
  );
}

export default Footer;
