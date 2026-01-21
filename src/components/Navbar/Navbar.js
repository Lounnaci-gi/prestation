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

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
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
                  onClick={toggleProfileDropdown}
                >
                  👤
                </button>
                
                {isProfileDropdownOpen && (
                  <div className="profile-dropdown-menu">
                    <button 
                      className="dropdown-item profile-edit"
                      onClick={() => {
                        navigate('/profile');
                        setIsProfileDropdownOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <span className="dropdown-icon">👤</span>
                      <span>Modifier le profil</span>
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <span className="dropdown-icon">🚪</span>
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