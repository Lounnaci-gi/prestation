import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import './Factures.css';

const Factures = () => {
  const mockFactures = [
    { id: 1, code: 'FAC-2026-001', client: 'Entreprise ABC', date: '2026-01-14', totalHT: '37,500 DZD', totalTTC: '45,000 DZD', statut: 'PAYEE' },
    { id: 2, code: 'FAC-2026-002', client: 'Société XYZ', date: '2026-01-13', totalHT: '27,083 DZD', totalTTC: '32,500 DZD', statut: 'EN ATTENTE' },
    { id: 3, code: 'FAC-2026-003', client: 'Client DEF', date: '2026-01-12', totalHT: '23,333 DZD', totalTTC: '28,000 DZD', statut: 'PAYEE' },
  ];

  const columns = [
    { header: 'Code Facture', key: 'code' },
    { header: 'Client', key: 'client' },
    { header: 'Date', key: 'date' },
    { header: 'Total HT', key: 'totalHT', align: 'right' },
    { header: 'Total TTC', key: 'totalTTC', align: 'right' },
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
          <Button size="small" variant="ghost">Télécharger</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="factures-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Factures</h1>
          <p className="page-subtitle">Liste des factures émises</p>
        </div>
        <Button variant="primary">+ Nouvelle Facture</Button>
      </div>

      <Card>
        <Table columns={columns} data={mockFactures} />
      </Card>
    </div>
  );
};

export default Factures;
