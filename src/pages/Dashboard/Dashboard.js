import React from 'react';
import Card from '../../components/Card';
import './Dashboard.css';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Clients',
      value: '245',
      change: '+12%',
      trend: 'up',
      icon: '👥',
      color: '#0369a1',
    },
    {
      title: 'Ventes du Mois',
      value: '1,284',
      change: '+8%',
      trend: 'up',
      icon: '💰',
      color: '#10b981',
    },
    {
      title: 'Devis en Attente',
      value: '32',
      change: '-5%',
      trend: 'down',
      icon: '📄',
      color: '#f59e0b',
    },
    {
      title: 'Factures Impayées',
      value: '18',
      change: '+3%',
      trend: 'up',
      icon: '🧾',
      color: '#ef4444',
    },
  ];

  const recentActivities = [
    { id: 1, type: 'Vente', client: 'Entreprise ABC', date: '2026-01-14', amount: '45,000 DZD' },
    { id: 2, type: 'Devis', client: 'Société XYZ', date: '2026-01-13', amount: '32,500 DZD' },
    { id: 3, type: 'Paiement', client: 'Client DEF', date: '2026-01-13', amount: '28,000 DZD' },
    { id: 4, type: 'Vente', client: 'Organisation GHI', date: '2026-01-12', amount: '51,200 DZD' },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="page-title">Tableau de Bord</h1>
        <p className="page-subtitle">Vue d'ensemble de votre activité</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <Card key={index} className="stat-card">
            <div className="stat-content">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
              <div className="stat-details">
                <p className="stat-title">{stat.title}</p>
                <h2 className="stat-value">{stat.value}</h2>
                <p className={`stat-change ${stat.trend}`}>
                  {stat.change} ce mois
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-content">
        <Card title="Activités Récentes" className="activities-card">
          <div className="activities-list">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-info">
                  <span className="activity-type">{activity.type}</span>
                  <span className="activity-client">{activity.client}</span>
                </div>
                <div className="activity-meta">
                  <span className="activity-date">{activity.date}</span>
                  <span className="activity-amount">{activity.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
