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
        <div className="action-buttons">
          <Button size="small" variant="ghost">Modifier</Button>
          <Button size="small" variant="ghost">Supprimer</Button>
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
