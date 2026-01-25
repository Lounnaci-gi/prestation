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
      title: 'Chiffre d\'Affaires',
      value: '2.4M DZD',
      change: '+18%',
      trend: 'up',
      icon: '📊',
      color: '#10b981',
    },
    {
      title: 'Devis en Attente',
      value: '32',
      change: '-5%',
      trend: 'down',
      icon: '📄',
      color: '#3b82f6',
    },
    {
      title: 'Taux de Conversion',
      value: '68%',
      change: '+4%',
      trend: 'up',
      icon: '📈',
      color: '#8b5cf6',
    },
  ];

  const salesTrendData = [
    { month: 'Jan', sales: 45000, target: 50000 },
    { month: 'Fév', sales: 52000, target: 50000 },
    { month: 'Mar', sales: 48000, target: 50000 },
    { month: 'Avr', sales: 61000, target: 60000 },
    { month: 'Mai', sales: 55000, target: 55000 },
    { month: 'Juin', sales: 67000, target: 65000 },
  ];

  const maxSales = Math.max(...salesTrendData.map(d => d.sales));
  const maxTarget = Math.max(...salesTrendData.map(d => d.target));
  const chartMax = Math.max(maxSales, maxTarget) * 1.15;

  const recentActivities = [
    { id: 1, type: 'Vente', client: 'Entreprise ABC', date: '2026-01-24', amount: '45,000 DZD', status: 'completed' },
    { id: 2, type: 'Devis', client: 'Société XYZ', date: '2026-01-23', amount: '32,500 DZD', status: 'pending' },
    { id: 3, type: 'Paiement', client: 'Client DEF', date: '2026-01-23', amount: '28,000 DZD', status: 'completed' },
    { id: 4, type: 'Vente', client: 'Organisation GHI', date: '2026-01-22', amount: '51,200 DZD', status: 'completed' },
    { id: 5, type: 'Facture', client: 'Groupe JKL', date: '2026-01-22', amount: '38,500 DZD', status: 'pending' },
  ];

  const topClients = [
    { name: 'Entreprise ABC', sales: '450,000 DZD', orders: 12 },
    { name: 'Société XYZ', sales: '320,000 DZD', orders: 8 },
    { name: 'Organisation GHI', sales: '290,000 DZD', orders: 7 },
  ];

  const renderChart = () => {
    return (
      <div className="chart-container">
        <div className="chart-bars">
          {salesTrendData.map((data, index) => (
            <div key={index} className="chart-item">
              <div className="bar-group">
                <div className="bar-wrapper">
                  <div
                    className="bar sales-bar"
                    style={{ height: `${(data.sales / chartMax) * 100}%` }}
                    title={`Ventes: ${data.sales.toLocaleString('fr-DZ')} DZD`}
                  />
                </div>
                <div className="bar-wrapper">
                  <div
                    className="bar target-bar"
                    style={{ height: `${(data.target / chartMax) * 100}%` }}
                    title={`Objectif: ${data.target.toLocaleString('fr-DZ')} DZD`}
                  />
                </div>
              </div>
              <span className="bar-label">{data.month}</span>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <div className="legend-item">
            <span className="legend-color sales-bar" />
            <span>Ventes Réelles</span>
          </div>
          <div className="legend-item">
            <span className="legend-color target-bar" />
            <span>Objectif</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Tableau de Bord</h1>
            <p className="page-subtitle">Vue d'ensemble de votre activité</p>
          </div>
          <div className="header-actions">
            <button 
              className="period-btn active"
              disabled
            >
              Semaine
            </button>
            <button 
              className="period-btn"
              disabled
            >
              Mois
            </button>
            <button 
              className="period-btn"
              disabled
            >
              Année
            </button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <Card key={index} className="stat-card">
            <div className="stat-content">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
                <span className="icon">{stat.icon}</span>
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
        <div className="dashboard-main">
          <Card title="Tendance des Ventes" className="chart-card">
            {renderChart()}
          </Card>

          <Card title="Meilleurs Clients" className="top-clients-card">
            <div className="clients-list">
              {topClients.map((client, index) => (
                <div key={index} className="client-item">
                  <div className="client-rank">
                    <span className="rank-badge">{index + 1}</span>
                  </div>
                  <div className="client-info">
                    <h4 className="client-name">{client.name}</h4>
                    <p className="client-details">{client.orders} commandes</p>
                  </div>
                  <div className="client-stats">
                    <span className="client-sales">{client.sales}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="dashboard-sidebar">
          <Card title="Activités Récentes" className="activities-card">
            <div className="activities-list">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-info">
                    <div className="activity-header">
                      <span className={`activity-type activity-${activity.type.toLowerCase()}`}>{activity.type}</span>
                      <span className={`activity-status ${activity.status}`}>
                        {activity.status === 'completed' ? '✓' : '⏳'}
                      </span>
                    </div>
                    <span className="activity-client">{activity.client}</span>
                    <span className="activity-date">{activity.date}</span>
                  </div>
                  <div className="activity-amount">{activity.amount}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;