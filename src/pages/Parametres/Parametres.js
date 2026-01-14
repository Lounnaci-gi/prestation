import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import AlertService from '../../utils/alertService';
import './Parametres.css';

const Parametres = () => {
  const [tarifs, setTarifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newTarif, setNewTarif] = useState({
    typePrestation: '',
    prixHT: '',
    tauxTVA: '19',
    dateDebut: new Date().toISOString().split('T')[0]
  });

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Simuler le chargement des données depuis la base de données
  useEffect(() => {
    const fetchTarifsFromDB = async () => {
      try {
        // Simuler un délai de chargement
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Données simulées basées sur la table Tarifs_Historique
        // Pour simuler une base de données vide, nous pouvons commenter cette partie
        // et laisser le tableau vide
        
        // Décommentez cette partie pour simuler des données existantes:
        /*
        const mockTarifs = [
          {
            id: 1,
            typePrestation: 'VENTE',
            prixHT: 25.50,
            tauxTVA: 19,
            dateDebut: '2026-01-01'
          },
          {
            id: 2,
            typePrestation: 'TRANSPORT',
            prixHT: 500.00,
            tauxTVA: 19,
            dateDebut: '2026-01-01'
          },
          {
            id: 3,
            typePrestation: 'VOL',
            prixHT: 0,
            tauxTVA: 19,
            dateDebut: '2026-01-01'
          },
          {
            id: 4,
            typePrestation: 'ESSAI',
            prixHT: 0,
            tauxTVA: 19,
            dateDebut: '2026-01-01'
          }
        ];
        */
        
        // Pour simuler une base de données vide (comme demandé)
        const mockTarifs = [];
        
        setTarifs(mockTarifs);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement des tarifs');
        setLoading(false);
      }
    };
    
    fetchTarifsFromDB();
  }, []);

  const handleAddTarif = async () => {
    if (newTarif.typePrestation && newTarif.prixHT) {
      const tarifToAdd = {
        id: Date.now(),
        ...newTarif,
        prixHT: parseFloat(newTarif.prixHT),
        tauxTVA: parseFloat(newTarif.tauxTVA)
      };
      setTarifs([...tarifs, tarifToAdd]);
      setNewTarif({
        typePrestation: '',
        prixHT: '',
        tauxTVA: '19',
        dateDebut: new Date().toISOString().split('T')[0]
      });
      
      await AlertService.success('Tarif ajouté', 'Le nouveau tarif a été ajouté avec succès.');
    } else {
      await AlertService.warning('Champs manquants', 'Veuillez remplir tous les champs requis.');
    }
  };

  const handleEdit = (tarif) => {
    setEditingId(tarif.id);
    setEditData({
      prixHT: tarif.prixHT,
      tauxTVA: tarif.tauxTVA
    });
  };

  const handleSaveEdit = async () => {
    setTarifs(tarifs.map(t => 
      t.id === editingId 
        ? { ...t, ...editData, prixHT: parseFloat(editData.prixHT), tauxTVA: parseFloat(editData.tauxTVA) }
        : t
    ));
    setEditingId(null);
    setEditData({});
    
    await AlertService.success('Tarif modifié', 'Le tarif a été mis à jour avec succès.');
  };

  const handleDelete = async (id) => {
    const result = await AlertService.confirm('Confirmation', 'Êtes-vous sûr de vouloir supprimer ce tarif ?', 'Supprimer', 'Annuler');
    
    if (result.isConfirmed) {
      setTarifs(tarifs.filter(t => t.id !== id));
      await AlertService.success('Tarif supprimé', 'Le tarif a été supprimé avec succès.');
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
                  onChange={(e) => setNewTarif({...newTarif, typePrestation: e.target.value})}
                >
                  <option value="">Sélectionner...</option>
                  <option value="VENTE">Citernage</option>
                  <option value="TRANSPORT">Transport</option>
                  <option value="VOL">Vol</option>
                  <option value="ESSAI">Essai</option>
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
                    <th>Date de début</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tarifs.map((tarif) => (
                    <tr key={tarif.id}>
                      <td>{tarif.typePrestation}</td>
                      <td>{tarif.prixHT.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>{tarif.tauxTVA}</td>
                      <td>{tarif.dateDebut}</td>
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
                              value={editData.tauxTVA}
                              onChange={(e) => setEditData({...editData, tauxTVA: e.target.value})}
                              step="0.01"
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
      
      <div className="form-actions" style={{ marginTop: '1.5rem' }}>
        <button className="btn btn-primary">Enregistrer les modifications</button>
      </div>
    </div>
  );
};

export default Parametres;