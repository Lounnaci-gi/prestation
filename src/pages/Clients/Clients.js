import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import Input from '../../components/Input';
import { getAllClients } from '../../api/clientsApi';
import AlertService from '../../utils/alertService';
import './Clients.css';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsFromDb = await getAllClients();
      
      // Transformer les données pour correspondre au format du tableau
      const formattedClients = clientsFromDb.map(client => ({
        id: client.ClientID,
        code: client.CodeClient,
        nom: client.NomRaisonSociale,
        adresse: client.Adresse,
        telephone: client.Telephone,
        email: client.Email
      }));
      
      setClients(formattedClients);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      await AlertService.error('Erreur', 'Impossible de charger la liste des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

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
        <div className="action-icons">
          <button className="icon-btn edit-btn" title="Modifier">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button className="icon-btn delete-btn" title="Supprimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      ),
    },
  ];

  const filteredClients = clients.filter(client =>
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
