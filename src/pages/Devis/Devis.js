import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import DevisForm from '../../components/DevisForm';
import './Devis.css';

const Devis = () => {
  const [showForm, setShowForm] = useState(false);
  const [mockDevis, setMockDevis] = useState([
    { id: 1, code: 'DEV-2026-001', client: 'Entreprise ABC', date: '2026-01-14', montant: '45,000 DZD', statut: 'ACCEPTE' },
    { id: 2, code: 'DEV-2026-002', client: 'Société XYZ', date: '2026-01-13', montant: '32,500 DZD', statut: 'EN ATTENTE' },
    { id: 3, code: 'DEV-2026-003', client: 'Client DEF', date: '2026-01-12', montant: '28,000 DZD', statut: 'REFUSE' },
  ]);

  const handleCreateDevis = (devisData) => {
    // Generate new code
    const newCode = `DEV-2026-${String(mockDevis.length + 1).padStart(3, '0')}`;
    
    // Get client name from mock data
    const clientNames = {
      '1': 'Entreprise ABC',
      '2': 'Société XYZ',
      '3': 'Client DEF',
      '4': 'Organisation GHI',
      '5': 'Société Algérie Eau',
      '6': 'Entreprise Hydro Plus',
      '7': 'SARL Aqua Services',
      '8': 'Entreprise Nationale des Eaux',
    };

    const newDevis = {
      id: mockDevis.length + 1,
      code: newCode,
      client: clientNames[devisData.clientId] || devisData.nomRaisonSociale || 'Client Inconnu',
      date: devisData.dateDevis,
      montant: `${devisData.totalTTC.toFixed(2)} DZD`,
      statut: devisData.statut,
    };

    setMockDevis([newDevis, ...mockDevis]);
    setShowForm(false);
    
    // Show success message
    alert('Devis créé avec succès!');
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const columns = [
    { header: 'Code Devis', key: 'code' },
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
    <div className="devis-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Devis</h1>
          <p className="page-subtitle">Devis quantitatifs et estimatifs</p>
        </div>
        {!showForm && (
          <Button variant="primary" onClick={() => setShowForm(true)}>+ Nouveau Devis</Button>
        )}
      </div>

      {showForm ? (
        <Card>
          <DevisForm 
            onSubmit={handleCreateDevis}
            onCancel={handleCancel}
          />
        </Card>
      ) : (
        <Card>
          <Table columns={columns} data={mockDevis} />
        </Card>
      )}
    </div>
  );
};

export default Devis;
