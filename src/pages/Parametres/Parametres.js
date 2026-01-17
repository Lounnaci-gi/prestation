import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import AlertService from '../../utils/alertService';
import { getAllTarifs, updateTarif, deleteTarif } from '../../api/tarifsApi';
import './Parametres.css';

const Parametres = () => {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTarif, setNewTarif] = useState({
    typePrestation: '',
    prixHT: '',
    tauxTVA: '19',
    volumeReference: '',
    dateDebut: new Date().toISOString().split('T')[0]
  });

  // Options de type de prestation
  const typePrestationOptions = [
    { value: 'CITERNAGE', label: 'Citernage' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'VOL', label: 'Vol' },
    { value: 'ESSAI', label: 'Essai' }
  ];

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    prixHT: '',
    tauxTVA: '19',
    volumeReference: '',
    dateDebut: ''
  });

  // Charger les données depuis la base de données
  useEffect(() => {
    const fetchTarifsFromDB = async () => {
      try {
        const fetchedTarifs = await getAllTarifs();
        
        // Convertir les données pour correspondre à la structure utilisée dans l'interface
        const uiFormatTarifs = fetchedTarifs.map(tarif => ({
          id: tarif.TarifID,
          typePrestation: tarif.TypePrestation,
          prixHT: tarif.PrixHT,
          tauxTVA: tarif.TauxTVA,
          volumeReference: tarif.VolumeReference,
          dateDebut: tarif.DateDebut
        }));
        
        setTarifs(uiFormatTarifs);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des tarifs');
        setLoading(false);
      }
    };
    
    fetchTarifsFromDB();
  }, []);

  // Fonction pour remplir automatiquement les champs quand un type est sélectionné
  const handleTypePrestationChange = (selectedType) => {
    setNewTarif(prev => ({
      ...prev,
      typePrestation: selectedType
    }));

    // Si un tarif avec ce type existe déjà, remplir les champs avec ses données
    const existingTarif = tarifs.find(t => t.typePrestation === selectedType);
    
    if (existingTarif) {
      // Formater la date au format YYYY-MM-DD
      const formattedDate = existingTarif.dateDebut instanceof Date 
        ? existingTarif.dateDebut.toISOString().split('T')[0]
        : typeof existingTarif.dateDebut === 'string'
          ? existingTarif.dateDebut.split('T')[0]
          : new Date().toISOString().split('T')[0];

      setNewTarif(prev => ({
        ...prev,
        prixHT: existingTarif.prixHT.toString(),
        tauxTVA: (existingTarif.tauxTVA * 100).toString(),
        volumeReference: existingTarif.volumeReference ? existingTarif.volumeReference.toString() : '',
        dateDebut: formattedDate
      }));
    } else {
      // Réinitialiser les champs si aucun tarif existant
      setNewTarif(prev => ({
        ...prev,
        prixHT: '',
        tauxTVA: '19',
        volumeReference: '',
        dateDebut: new Date().toISOString().split('T')[0]
      }));
    }
  };

  const handleAddTarif = async () => {
    if (newTarif.typePrestation && newTarif.prixHT) {
      try {
        // Demander confirmation AVANT d'envoyer au backend
        const confirmResult = await AlertService.confirm(
          'Confirmation', 
          'Voulez-vous enregistrer ce tarif dans la base de données ?', 
          'Oui', 
          'Non'
        );
        
        if (!confirmResult.isConfirmed) {
          return; // Annuler si l'utilisateur clique sur "Non"
        }
        
        // Préparer les données conformément à la structure de la table Tarifs_Historique
        const tarifToAdd = {
          TypePrestation: newTarif.typePrestation.trim(),
          PrixHT: parseFloat(newTarif.prixHT),
          TauxTVA: parseFloat(newTarif.tauxTVA) > 1 ? parseFloat(newTarif.tauxTVA) / 100 : parseFloat(newTarif.tauxTVA),
          VolumeReference: newTarif.volumeReference ? parseInt(newTarif.volumeReference) : null,
          DateDebut: newTarif.dateDebut
        };
        
        // Ajouter à la base de données
        const response = await fetch('/api/tarifs-historique', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tarifToAdd)
        });

        const result = await response.json();
        
        if (response.ok) {
          // Succès - tarif créé
          // Convertir pour l'interface utilisateur
          const uiFormatTarif = {
            id: result.TarifID,
            typePrestation: result.TypePrestation,
            prixHT: result.PrixHT,
            tauxTVA: result.TauxTVA,
            volumeReference: result.VolumeReference,
            dateDebut: result.DateDebut
          };
          
          // Mettre à jour l'état local
          setTarifs(prevTarifs => [...prevTarifs, uiFormatTarif]);
          setNewTarif({
            typePrestation: '',
            prixHT: '',
            tauxTVA: '19',
            volumeReference: '',
            dateDebut: new Date().toISOString().split('T')[0]
          });
          
          // Recharger les données depuis la base pour s'assurer de la synchronisation
          const freshTarifs = await getAllTarifs();
          const uiFormatFreshTarifs = freshTarifs.map(tarif => ({
            id: tarif.TarifID,
            typePrestation: tarif.TypePrestation,
            prixHT: tarif.PrixHT,
            tauxTVA: tarif.TauxTVA,
            dateDebut: tarif.DateDebut
          }));
          setTarifs(uiFormatFreshTarifs);
          
          await AlertService.success('Tarif créé', 'Le tarif a été créé avec succès dans la table Tarifs_Historique.');
        } else if (response.status === 409) {
          // Conflit - tarif existe déjà
          const existingTarif = result.existingTarif;
          
          // Proposer de modifier le tarif existant
          const modifyResult = await AlertService.confirm(
            'Tarif existant', 
            `Un tarif pour "${newTarif.typePrestation}" existe déjà. Voulez-vous le modifier avec les nouvelles valeurs ?`, 
            'Modifier', 
            'Annuler'
          );
          
          if (modifyResult.isConfirmed) {
            // Conversion du type de prestation
            const typePrestationDB = newTarif.typePrestation.trim().toUpperCase() === 'CITERNAGE' ? 'CITERNAGE' : newTarif.typePrestation.trim();
            
            // Modifier le tarif existant
            const tarifToUpdate = {
              TypePrestation: typePrestationDB,
              PrixHT: parseFloat(newTarif.prixHT),
              TauxTVA: parseFloat(newTarif.tauxTVA) > 1 ? parseFloat(newTarif.tauxTVA) / 100 : parseFloat(newTarif.tauxTVA),
              VolumeReference: newTarif.volumeReference ? parseInt(newTarif.volumeReference) : null,
              DateDebut: newTarif.dateDebut
            };
            
            const updateResponse = await fetch(`/api/tarifs-historique/${existingTarif.TarifID}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(tarifToUpdate)
            });
            
            if (updateResponse.ok) {
              await updateResponse.json();
              
              // Recharger les données depuis la base après modification
              const freshTarifs = await getAllTarifs();
              const uiFormatFreshTarifs = freshTarifs.map(tarif => ({
                id: tarif.TarifID,
                typePrestation: tarif.TypePrestation,
                prixHT: tarif.PrixHT,
                tauxTVA: tarif.TauxTVA,
                dateDebut: tarif.DateDebut
              }));
              setTarifs(uiFormatFreshTarifs);
              
              setNewTarif({
                typePrestation: '',
                prixHT: '',
                tauxTVA: '19',
                volumeReference: '',
                dateDebut: new Date().toISOString().split('T')[0]
              });
              
              await AlertService.success('Tarif modifié', 'Le tarif a été mis à jour avec succès dans la table Tarifs_Historique.');
            } else {
              const updateError = await updateResponse.json();
              throw new Error(updateError.error || 'Erreur lors de la modification du tarif');
            }
          }
        } else {
          // Autre erreur
          throw new Error(result.error || 'Erreur inconnue lors de l\'ajout du tarif');
        }
        
      } catch (error) {
        await AlertService.error('Erreur', `Impossible de traiter le tarif: ${error.message}`);
      }
    } else {
      await AlertService.warning('Champs manquants', 'Veuillez remplir tous les champs requis.');
    }
  };

  const handleEdit = (tarif) => {
    setEditingId(tarif.id);
    
    // Formater la date pour l'affichage dans l'input
    const formattedDate = typeof tarif.dateDebut === 'string' 
      ? tarif.dateDebut.split('T')[0]
      : new Date(tarif.dateDebut).toISOString().split('T')[0];
    
    setEditData({
      prixHT: tarif.prixHT,
      tauxTVA: tarif.tauxTVA * 100,
      volumeReference: tarif.volumeReference || '',
      dateDebut: formattedDate
    });
  };

  const handleSaveEdit = async () => {
    try {
      // Obtenir le type de prestation original
      const originalTypePrestation = tarifs.find(t => t.id === editingId)?.typePrestation;
      
      // Conversion du type de prestation
      const typePrestationDB = originalTypePrestation === 'CITERNAGE' ? 'CITERNAGE' : originalTypePrestation;
      
      // Préparer les données conformément à la structure de la table Tarifs_Historique
      const tarifToUpdate = {
        TypePrestation: typePrestationDB,
        PrixHT: parseFloat(editData.prixHT),
        TauxTVA: parseFloat(editData.tauxTVA) > 1 ? parseFloat(editData.tauxTVA) / 100 : parseFloat(editData.tauxTVA),
        VolumeReference: editData.volumeReference ? parseInt(editData.volumeReference) : null,
        DateDebut: editData.dateDebut
      };
      
      // Mettre à jour dans la base de données
      await updateTarif(editingId, tarifToUpdate);
      
      // Recharger les données depuis la base après modification
      const freshTarifs = await getAllTarifs();
      const uiFormatFreshTarifs = freshTarifs.map(tarif => ({
        id: tarif.TarifID,
        typePrestation: tarif.TypePrestation,
        prixHT: tarif.PrixHT,
        tauxTVA: tarif.TauxTVA,
        dateDebut: tarif.DateDebut
      }));
      setTarifs(uiFormatFreshTarifs);
      
      setEditingId(null);
      setEditData({});
      
      await AlertService.success('Tarif modifié', 'Le tarif a été mis à jour avec succès dans la table Tarifs_Historique.');
    } catch (error) {
      await AlertService.error('Erreur', 'Impossible de modifier le tarif dans la base de données. Veuillez réessayer.');
    }
  };

  const handleDelete = async (id) => {
    const result = await AlertService.confirm('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce tarif de la table Tarifs_Historique ?', 'Supprimer', 'Annuler');
    
    if (result.isConfirmed) {
      try {
        // Supprimer de la base de données
        await deleteTarif(id);
        
        // Recharger les données depuis la base après suppression
        const freshTarifs = await getAllTarifs();
        const uiFormatFreshTarifs = freshTarifs.map(tarif => ({
          id: tarif.TarifID,
          typePrestation: tarif.TypePrestation,
          prixHT: tarif.PrixHT,
          tauxTVA: tarif.TauxTVA,
          volumeReference: tarif.VolumeReference,
          dateDebut: tarif.DateDebut
        }));
        setTarifs(uiFormatFreshTarifs);
        
        await AlertService.success('Tarif supprimé', 'Le tarif a été supprimé avec succès de la table Tarifs_Historique.');
      } catch (error) {
        await AlertService.error('Erreur', 'Impossible de supprimer le tarif de la base de données. Veuillez réessayer.');
      }
    }
  };

  if (loading) {
    return (
      <div className="parametres">
        <div className="page-header">
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Chargement des paramètres en cours...</p>
        </div>
        <div className="loading-spinner">Chargement des tarifs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="parametres">
        <div className="page-header">
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Erreur de chargement</p>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="parametres">
      <div className="page-header">
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Gestion des paramètres de l'application</p>
      </div>

      <Card title="Tarifs et Taxes" style={{ marginTop: '1rem' }}>
        <div className="tarifs-section">
          <div className="tarif-form">
            <h4>Ajouter un nouveau tarif</h4>
            <div className="form-row">
              <div className="setting-item">
                <label className="setting-label">Type de prestation</label>
                <select 
                  className="setting-input"
                  value={newTarif.typePrestation}
                  onChange={(e) => handleTypePrestationChange(e.target.value)}
                >
                  <option value="">Sélectionner...</option>
                  {typePrestationOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
                            
              <div className="setting-item">
                <label className="setting-label">Prix HT (DZD)</label>
                <input 
                  type="number" 
                  className="setting-input" 
                  value={newTarif.prixHT}
                  onChange={(e) => setNewTarif({...newTarif, prixHT: e.target.value})}
                  placeholder="Prix HT"
                  step="0.01"
                />
              </div>
                            
              <div className="setting-item">
                <label className="setting-label">Taux TVA (%)</label>
                <input 
                  type="number" 
                  className="setting-input" 
                  value={newTarif.tauxTVA}
                  onChange={(e) => setNewTarif({...newTarif, tauxTVA: e.target.value})}
                  placeholder="Taux TVA"
                  step="0.01"
                />
              </div>
                            
              <div className="setting-item">
                <label className="setting-label">Volume de Référence (m³)</label>
                <input 
                  type="number" 
                  className="setting-input" 
                  value={newTarif.volumeReference}
                  onChange={(e) => setNewTarif({...newTarif, volumeReference: e.target.value})}
                  placeholder="Volume de référence (s'applique uniquement au transport)"
                  step="1"
                  disabled={newTarif.typePrestation !== 'TRANSPORT'}
                />
              </div>
                            
              <div className="setting-item">
                <label className="setting-label">Date de début</label>
                <input 
                  type="date" 
                  className="setting-input" 
                  value={newTarif.dateDebut}
                  onChange={(e) => setNewTarif({...newTarif, dateDebut: e.target.value})}
                />
              </div>
                            
              <div className="setting-item" style={{ alignSelf: 'flex-end' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleAddTarif}
                  disabled={!newTarif.typePrestation || !newTarif.prixHT}
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
          
          <div className="tarifs-table">
            <h4>Liste des tarifs actuels</h4>
            {tarifs.length === 0 ? (
              <div className="no-data">Aucun tarif enregistré</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type de prestation</th>
                    <th>Prix HT (DZD)</th>
                    <th>Taux TVA (%)</th>
                    <th>Volume Réf. (m³)</th>
                    <th>Date de début</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tarifs.map((tarif) => (
                    <tr key={tarif.id}>
                      <td>{tarif.typePrestation}{tarif.volumeReference && tarif.typePrestation === 'TRANSPORT' ? ' (variable)' : ''}</td>
                      <td>{tarif.prixHT.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{typeof tarif.tauxTVA === 'number' && tarif.tauxTVA < 1 ? (tarif.tauxTVA * 100).toFixed(2) : tarif.tauxTVA}%</td>
                      <td>{tarif.volumeReference || '-'}</td>
                      <td>
                        {/* Formater la date pour l'affichage */}
                        {typeof tarif.dateDebut === 'string' 
                          ? tarif.dateDebut.split('T')[0] 
                          : new Date(tarif.dateDebut).toISOString().split('T')[0]}
                      </td>
                      <td className="actions-cell">
                        {editingId === tarif.id ? (
                          <>
                            <input
                              type="number"
                              className="setting-input small-input"
                              value={editData.prixHT}
                              onChange={(e) => setEditData({...editData, prixHT: e.target.value})}
                              step="0.01"
                            />
                            <input
                              type="number"
                              className="setting-input small-input"
                              value={typeof editData.tauxTVA === 'number' && editData.tauxTVA < 1 ? (editData.tauxTVA * 100).toFixed(2) : editData.tauxTVA}
                              onChange={(e) => setEditData({...editData, tauxTVA: e.target.value})}
                              step="0.01"
                            />
                            <input
                              type="number"
                              className="setting-input small-input"
                              value={editData.volumeReference || ''}
                              onChange={(e) => setEditData({...editData, volumeReference: e.target.value})}
                              step="1"
                              disabled={tarifs.find(t => t.id === editingId)?.typePrestation !== 'TRANSPORT'}
                            />
                            <input
                              type="date"
                              className="setting-input small-input"
                              value={editData.dateDebut || ''}
                              onChange={(e) => setEditData({...editData, dateDebut: e.target.value})}
                            />
                            <button className="btn btn-primary" onClick={handleSaveEdit}>Sauver</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary" onClick={() => handleEdit(tarif)}>Modifier</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(tarif.id)}>Supprimer</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Parametres;