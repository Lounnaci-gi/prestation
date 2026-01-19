import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Table from '../../components/Table';
import DevisForm from '../../components/DevisForm';
import AlertService from '../../utils/alertService';
import { createDevis, getAllDevis, updateDevis, getDevisById, deleteDevis } from '../../api/devisApi';
import './Devis.css';

const Devis = () => {
  const [showForm, setShowForm] = useState(false);
  const [devisList, setDevisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDevis, setEditingDevis] = useState(null);

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
      setEditingDevis(null);
      
      // Show success message
      await AlertService.success('Devis créé', 'Le devis a été créé avec succès dans la base de données!');
    } catch (error) {
      console.error('Erreur lors de la création du devis:', error);
      console.error('Détails de l\'erreur:', error);
      await AlertService.error('Erreur', error.error || 'Une erreur est survenue lors de la création du devis');
    }
  };
  
  const handleUpdateDevis = async (devisData) => {
    try {
      console.log('Données envoyées au backend pour mise à jour:', devisData);
      // Appeler l'API pour mettre à jour le devis
      // Extraire l'ID du devis à partir des données originales ou des nouvelles données
      const devisId = editingDevis.DevisID || editingDevis.id;
      const result = await updateDevis(devisId, devisData);
      
      console.log('Réponse du backend:', result);
      
      // Rafraîchir la liste des devis
      await loadDevis();
      
      setShowForm(false);
      setEditingDevis(null);
      
      // Show success message
      await AlertService.success('Devis mis à jour', 'Le devis a été mis à jour avec succès dans la base de données!');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du devis:', error);
      console.error('Détails de l\'erreur:', error);
      await AlertService.error('Erreur', error.error || 'Une erreur est survenue lors de la mise à jour du devis');
    }
  };

  const loadDevis = async () => {
    try {
      setLoading(true);
      const devisData = await getAllDevis();
      
      // Transformer les données pour correspondre au format du tableau
      const formattedDevis = devisData.map(d => ({
        id: d.DevisID,
        code: d.CodeDevis,
        client: d.NomRaisonSociale,
        date: d.DateVente ? new Date(d.DateVente).toISOString().split('T')[0] : '',
        montant: `${d.TotalTTC?.toFixed(2) || '0.00'} DZD`,
        statut: d.Statut,
      }));
      
      setDevisList(formattedDevis);
    } catch (error) {
      console.error('Erreur lors du chargement des devis:', error);
      // En cas d'erreur, on affiche quand même un message
      AlertService.error('Erreur', 'Impossible de charger les devis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevis();
  }, []);

  const handleEditDevis = async (devis) => {
    try {
      console.log('Données reçues pour édition:', devis); // Pour déboguer
      
      // Vérifier que l'argument n'est pas undefined
      if (!devis) {
        await AlertService.error('Erreur', 'Données du devis non disponibles pour l\'édition');
        return;
      }
      
      // Charger directement les détails du devis à partir de l'API
      const devisId = devis.id || devis.DevisID;
      
      if (!devisId) {
        await AlertService.error('Erreur', 'ID du devis non disponible pour l\'édition');
        return;
      }
      
      const fullDevis = await getDevisById(devisId);
      
      if (fullDevis) {
        setEditingDevis(fullDevis);
        setShowForm(true);
      } else {
        await AlertService.error('Erreur', 'Impossible de charger les détails du devis');
      }
    } catch (error) {
      console.error('Erreur lors du chargement du devis pour édition:', error);
      await AlertService.error('Erreur', 'Impossible de charger les détails du devis');
    }
  };
  
  const handleCancel = async () => {
    // Cette fonction est appelée par le formulaire après confirmation
    // On ferme simplement le formulaire et on recharge la liste des devis
    setShowForm(false);
    setEditingDevis(null);
    await loadDevis();
  };

  const handleDeleteDevis = async (devis) => {
    // Afficher la confirmation de suppression
    const confirmed = await AlertService.confirm(
      'Confirmation de suppression',
      `Êtes-vous sûr de vouloir supprimer le devis ${devis.code} ?`
    );
    
    if (!confirmed) {
      return; // Annuler si l'utilisateur clique sur "Annuler"
    }
    
    try {
      // Procéder à la suppression
      const devisId = devis.id || devis.DevisID;
      await deleteDevis(devisId);
      
      // Afficher le message de succès
      await AlertService.success('Devis supprimé', 'Le devis a été supprimé avec succès');
    } catch (error) {
      // Log l'erreur pour débogage
      console.log('Status:', error.response?.status);
      console.log('Data:', error.response?.data);
      console.log('Error message:', error.message);
      console.log('Full error:', error);
      
      // Si le devis est déjà supprimé, on reçoit un objet avec error: 'Devis non trouvé'
      // ou une erreur 404
      if ((error.response && error.response.status === 404) || 
          (typeof error === 'object' && error.error === 'Devis non trouvé') ||
          (error.response && error.response.data && error.response.data.error === 'Devis non trouvé')) {
        await AlertService.success('Devis supprimé', 'Le devis a déjà été supprimé');
      } else {
        // Pour les autres erreurs, afficher le message d'erreur
        console.error('Erreur lors de la suppression du devis:', error);
        const errorMessage = error.response?.data?.error || error.error || 'Une erreur est survenue lors de la suppression du devis';
        await AlertService.error('Erreur', errorMessage);
        return; // Ne pas recharger la liste en cas d'erreur
      }
    }
    
    // Recharger la liste des devis dans tous les cas (succès ou devis déjà supprimé)
    await loadDevis();
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
      render: (_, fullRow) => (
        <div className="action-icons">
          <button className="icon-btn view-btn" title="Voir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <button 
            className="icon-btn edit-btn" 
            title="Modifier"
            onClick={() => handleEditDevis(fullRow)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button 
            className="icon-btn delete-btn" 
            title="Supprimer"
            onClick={() => handleDeleteDevis(fullRow)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
          <button className="icon-btn print-btn" title="Imprimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 6,2 18,2 18,9" />
              <path d="M6,18H4a2,2,0,0,1-2-2v-8A2,2,0,0,1,2,6H20a2,2,0,0,1,2,2v8a2,2,0,0,1-2,2H18" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
            </svg>
          </button>
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
          <Button variant="primary" onClick={() => {
            setEditingDevis(null);
            setShowForm(true);
          }}>+ Nouveau Devis</Button>
        )}
      </div>

      {showForm ? (
        <Card>
          <DevisForm 
            onSubmit={editingDevis ? handleUpdateDevis : handleCreateDevis}
            onCancel={handleCancel}
            initialData={editingDevis}
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