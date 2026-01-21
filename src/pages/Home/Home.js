import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Nouveau Client',
      description: 'Ajouter un nouveau client à la base de données',
      icon: '👥',
      link: '/clients'
    },
    {
      title: 'Créer Devis',
      description: 'Générer un nouveau devis pour un client',
      icon: '📄',
      link: '/devis'
    },
    {
      title: 'Gestion Ventes',
      description: 'Suivre et gérer les ventes effectuées',
      icon: '💰',
      link: '/ventes'
    },
    {
      title: 'Facturation',
      description: 'Créer et gérer les factures',
      icon: '🧾',
      link: '/factures'
    }
  ];

  const features = [
    {
      title: 'Dashboard Complet',
      description: 'Visualisez vos données clés avec des graphiques interactifs et des indicateurs de performance.',
      icon: '📊'
    },
    {
      title: 'Gestion Clients',
      description: 'Gérez efficacement votre base de clients avec des informations détaillées et historiques.',
      icon: '👥'
    },
    {
      title: 'Processus de Vente',
      description: 'Suivez vos ventes du devis initial à la facturation finale avec une traçabilité complète.',
      icon: '🔄'
    }
  ];

  return (
    <div className="home-page">
      <section className="hero-section">
        <h1 className="hero-title">
          Bienvenue dans le système de gestion de prestation
        </h1>
        <p className="hero-subtitle">
          {user 
            ? `Bonjour ${user.Nom} ${user.Prenom}, commencez à gérer vos prestations de manière efficace et professionnelle.` 
            : 'Connectez-vous pour accéder à votre espace de gestion professionnel.'
          }
        </p>
        
        <div className="quick-actions">
          {quickActions.map((action, index) => (
            <Link 
              key={index} 
              to={action.link} 
              className="quick-action-card"
            >
              <div className="quick-action-icon">{action.icon}</div>
              <h3 className="quick-action-title">{action.title}</h3>
              <p className="quick-action-desc">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-description">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;