import React from 'react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <main className="main-content">
        {children}
      </main>
      <footer className="footer">
        <p>© 2026 Gestion Eau - Système de gestion des ventes d'eau</p>
      </footer>
    </div>
  );
};

export default Layout;
