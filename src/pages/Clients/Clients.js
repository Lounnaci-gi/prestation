import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import Input from '../../components/Input';
import './Clients.css';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const mockClients = [
    { id: 1, code: 'CLI001', nom: 'Entreprise ABC', adresse: 'Alger', telephone: '0555123456', email: 'contact@abc.dz' },
    { id: 2, code: 'CLI002', nom: 'Société XYZ', adresse: 'Oran', telephone: '0555234567', email: 'info@xyz.dz' },
    { id: 3, code: 'CLI003', nom: 'Client DEF', adresse: 'Constantine', telephone: '0555345678', email: 'def@email.dz' },
    { id: 4, code: 'CLI004', nom: 'Organisation GHI', adresse: 'Annaba', telephone: '0555456789', email: 'contact@ghi.dz' },
  ];

  const columns = [
    { header: 'Code', key: 'code' },
    { header: 'Nom/Raison Sociale', key: 'nom' },
    { header: 'Adresse', key: 'adresse' },
    { header: 'Téléphone', key: 'telephone' },
    { header: 'Email', key: 'email' },
    {
      header: 'Actions',
      key: 'actions',
      align: 'center',
      render: () => (
        <div className="action-buttons">
          <Button size="small" variant="ghost">Modifier</Button>
          <Button size="small" variant="ghost">Supprimer</Button>
        </div>
      ),
    },
  ];

  const filteredClients = mockClients.filter(client =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="clients-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Clients</h1>
          <p className="page-subtitle">Liste des clients et abonnés</p>
        </div>
        <Button variant="primary">+ Nouveau Client</Button>
      </div>

      <Card>
        <div className="search-bar">
          <Input
            type="text"
            placeholder="Rechercher un client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Table columns={columns} data={filteredClients} />
      </Card>
    </div>
  );
};

export default Clients;
