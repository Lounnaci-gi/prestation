import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Tableau de Bord' },
    { path: '/clients', label: 'Clients' },
    { path: '/ventes', label: 'Ventes' },
    { path: '/devis', label: 'Devis' },
    { path: '/factures', label: 'Factures' },
    { path: '/parametres', label: 'Paramètres' },
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <img src="/ade.png" alt="Logo" className="brand-logo" />
          <span className="brand-name">Gestion Eau</span>
        </div>

        <button 
          className="mobile-menu-button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="hamburger-text">MENU</span>
        </button>

        <div className={`navbar-menu ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
          
          {/* Section utilisateur connecté */}
          {user && (
            <div className="navbar-user-info">
              <span className="user-name">{user.Nom} {user.Prenom}</span>
              
              {/* Menu déroulant du profil */}
              <div className="profile-dropdown">
                <button 
                  className="profile-button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                >
                  👤
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu open">
                    <button 
                      className="dropdown-item profile-edit"
                      onClick={() => {
                        navigate('/parametres');
                        setIsProfileDropdownOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <svg className="dropdown-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>Modifier le profil</span>
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <svg className="dropdown-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                      </svg>
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
