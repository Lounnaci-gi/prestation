import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import './Ventes.css';

const Ventes = () => {
  const mockVentes = [
    { id: 1, type: 'VENTE', client: 'Entreprise ABC', date: '2026-01-14', montant: '45,000 DZD', statut: 'Payée' },
    { id: 2, type: 'PROCES_VOL', client: 'Société XYZ', date: '2026-01-13', montant: '32,500 DZD', statut: 'En cours' },
    { id: 3, type: 'ESSAI_RESEAU', client: 'Client DEF', date: '2026-01-12', montant: '28,000 DZD', statut: 'Payée' },
    { id: 4, type: 'VENTE', client: 'Organisation GHI', date: '2026-01-11', montant: '51,200 DZD', statut: 'En attente' },
  ];

  const columns = [
    { header: 'Type', key: 'type' },
    { header: 'Client', key: 'client' },
    { header: 'Date', key: 'date' },
    { header: 'Montant', key: 'montant', align: 'right' },
    {
      header: 'Statut',
      key: 'statut',
      render: (value) => (
        <span className={`status-badge status-${value.toLowerCase().replace(' ', '-')}`}>
          {value}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: () => (
        <div className="action-buttons">
          <Button size="small" variant="ghost">Voir</Button>
          <Button size="small" variant="ghost">Modifier</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="ventes-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Ventes</h1>
          <p className="page-subtitle">Liste des ventes et dossiers</p>
        </div>
        <Button variant="primary">+ Nouvelle Vente</Button>
      </div>

      <Card>
        <Table columns={columns} data={mockVentes} />
      </Card>
    </div>
  );
};

export default Ventes;
