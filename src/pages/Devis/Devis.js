import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import DevisForm from '../../components/DevisForm';
import AlertService from '../../utils/alertService';
import { createDevis } from '../../api/devisApi';
import './Devis.css';

const Devis = () => {
  const [showForm, setShowForm] = useState(false);
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleCreateDevis = async (devisData) => {
    try {
      console.log('Données envoyées au backend:', devisData);
      // Appeler l'API pour créer le devis
      const result = await createDevis(devisData);
      
      console.log('Réponse du backend:', result);
      
      // Rafraîchir la liste des devis
      // Pour simplifier, on va juste ajouter le nouveau devis à la liste locale
      // Dans une vraie application, on devrait recharger depuis l'API
      const newDevis = {
        id: result.DevisID,
        code: result.CodeDevis,
        client: result.NomRaisonSociale,
        date: result.DateVente.split('T')[0],
        montant: `${result.TotalTTC.toFixed(2)} DZD`,
        statut: result.Statut,
      };
      
      setDevisList([newDevis, ...devisList]);
      setShowForm(false);
      
      // Show success message
      await AlertService.success('Devis créé', 'Le devis a été créé avec succès dans la base de données!');
    } catch (error) {
      console.error('Erreur lors de la création du devis:', error);
      console.error('Détails de l\'erreur:', error);
      await AlertService.error('Erreur', error.error || 'Une erreur est survenue lors de la création du devis');
    }
  };

  const loadDevis = async () => {
    try {
      setLoading(true);
      // Pour l'instant, on utilise un tableau vide car l'API de lecture n'est pas encore implémentée
      // Mais on pourra l'ajouter plus tard
      setDevisList([]);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevis();
  }, []);

  const handleCancel = async () => {
    const result = await AlertService.confirm(
      'Annuler la création',
      'Êtes-vous sûr de vouloir annuler la création du devis ?',
      'Annuler',
      'Continuer'
    );
    
    if (result.isConfirmed) {
      setShowForm(false);
    }
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
          {loading ? (
            <div className="loading">Chargement des devis...</div>
          ) : (
            <Table columns={columns} data={devisList} />
          )}
        </Card>
      )}
    </div>
  );
};

export default Devis;