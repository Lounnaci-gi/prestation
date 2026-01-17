import React, { useState, useEffect } from 'react';
import Input from '../../components/Input';
import Select from '../../components/Select';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import AlertService from '../../utils/alertService';
import { getAllTarifs } from '../../api/tarifsApi';
import { amountToWords } from '../../utils/numberToWords';
import './DevisForm.css';

const DevisForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    // Client info fields
    codeClient: '',
    nomRaisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
    // Quote fields
    typeDossier: '',
    prixUnitaireM3_HT: '',
    tauxTVA_Eau: '19',
    inclureTransport: false,
    prixTransportUnitaire_HT: '0',
    tauxTVA_Transport: '19',
    dateDevis: new Date().toISOString().split('T')[0],
    statut: 'EN ATTENTE',
    notes: '',
  });

  const [citerneRows, setCiterneRows] = useState([
    { id: Date.now(), nombreCiternes: '1', volumeParCiterne: '', inclureTransport: false }
  ]);

  const addCiterneRow = () => {
    setCiterneRows([...citerneRows, { id: Date.now(), nombreCiternes: '1', volumeParCiterne: '', inclureTransport: false }]);
  };

  const removeCiterneRow = (id) => {
    if (citerneRows.length > 1) {
      setCiterneRows(citerneRows.filter(row => row.id !== id));
    }
  };

  const updateCiterneRow = (id, field, value) => {
    setCiterneRows(citerneRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const toggleTransportCiterne = (id) => {
    setCiterneRows(citerneRows.map(row => 
      row.id === id ? { ...row, inclureTransport: !row.inclureTransport } : row
    ));
  };

  const [errors, setErrors] = useState({});
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [tarifs, setTarifs] = useState([]);

  // Charger les tarifs depuis l'API
  useEffect(() => {
    const fetchTarifs = async () => {
      try {
        const fetchedTarifs = await getAllTarifs();
        setTarifs(fetchedTarifs);
      } catch (error) {
        console.error('Erreur lors du chargement des tarifs:', error);
      }
    };

    fetchTarifs();
  }, []);

  // Fonction pour obtenir le dernier tarif applicable pour un type de prestation
  const getTarifByType = (typePrestation) => {
    // Filtrer les tarifs actifs pour le type de prestation spécifié
    const tarifsActifs = tarifs.filter(t => 
      t.TypePrestation === typePrestation &&
      (!t.DateFin || new Date(t.DateFin) > new Date())
    );
    
    // Trier par date de début décroissante pour obtenir le plus récent
    tarifsActifs.sort((a, b) => new Date(b.DateDebut) - new Date(a.DateDebut));
    
    // Retourner le premier (le plus récent) ou null si aucun trouvé
    return tarifsActifs.length > 0 ? tarifsActifs[0] : null;
  };

  // Mettre à jour automatiquement le prix unitaire et la TVA quand le type de devis change
  useEffect(() => {
    if (formData.typeDossier) {
      // Convertir le type de devis en type de prestation correspondant
      let typePrestation = '';
      switch (formData.typeDossier) {
        case 'CITERNAGE':
          typePrestation = 'CITERNAGE'; // CITERNAGE reste CITERNAGE
          break;
        case 'PROCES_VOL':
          typePrestation = 'VOL';
          break;
        case 'ESSAI_RESEAU':
          typePrestation = 'ESSAI';
          break;
        default:
          typePrestation = '';
      }
      
      if (typePrestation) {
        const tarif = getTarifByType(typePrestation);
        if (tarif) {
          // Mettre à jour le prix unitaire et la TVA
          setFormData(prev => ({
            ...prev,
            prixUnitaireM3_HT: tarif.PrixHT.toString(),
            tauxTVA_Eau: (tarif.TauxTVA * 100).toString() // Convertir en pourcentage
          }));
        }
      }
      
      // Pour le transport, charger les tarifs de transport si le type de devis est CITERNAGE
      if (formData.typeDossier === 'CITERNAGE') {
        const tarifTransport = getTarifByType('TRANSPORT');
        if (tarifTransport) {
          // Mettre à jour le prix de transport et la TVA de transport
          setFormData(prev => ({
            ...prev,
            prixTransportUnitaire_HT: tarifTransport.PrixHT.toString(),
            tauxTVA_Transport: (tarifTransport.TauxTVA * 100).toString() // Convertir en pourcentage
          }));
        }
      }
    }
  }, [formData.typeDossier, tarifs]);

  // Mettre à jour automatiquement le prix de transport quand le volume change
  useEffect(() => {
    if (formData.volumeParCiterne && tarifs.length > 0) {
      const nouveauPrixTransport = getPrixTransportSelonVolume(parseFloat(formData.volumeParCiterne) || 0);
      if (nouveauPrixTransport !== parseFloat(formData.prixTransportUnitaire_HT)) {
        setFormData(prev => ({
          ...prev,
          prixTransportUnitaire_HT: nouveauPrixTransport.toString()
        }));
      }
    }
  }, [formData.volumeParCiterne, tarifs]);

  // Mock data - In production, fetch from API
  const clients = [
    { value: 'new', label: '+ Créer un nouveau client', code: 'NEW', isNew: true },
    { value: '1', label: 'Entreprise ABC', code: 'CLI001', adresse: 'Alger Centre, Algeria', telephone: '0555123456', email: 'contact@abc.dz' },
    { value: '2', label: 'Société XYZ', code: 'CLI002', adresse: 'Oran, Algeria', telephone: '0555234567', email: 'info@xyz.dz' },
    { value: '3', label: 'Client DEF', code: 'CLI003', adresse: 'Constantine, Algeria', telephone: '0555345678', email: 'def@email.dz' },
    { value: '4', label: 'Organisation GHI', code: 'CLI004', adresse: 'Annaba, Algeria', telephone: '0555456789', email: 'contact@ghi.dz' },
    { value: '5', label: 'Société Algérie Eau', code: 'CLI005', adresse: 'Blida, Algeria', telephone: '0555567890', email: 'info@algerieeau.dz' },
    { value: '6', label: 'Entreprise Hydro Plus', code: 'CLI006', adresse: 'Tlemcen, Algeria', telephone: '0555678901', email: 'contact@hydroplus.dz' },
    { value: '7', label: 'SARL Aqua Services', code: 'CLI007', adresse: 'Sétif, Algeria', telephone: '0555789012', email: 'info@aquaservices.dz' },
    { value: '8', label: 'Entreprise Nationale des Eaux', code: 'CLI008', adresse: 'Alger, Algeria', telephone: '0555890123', email: 'contact@ene.dz' },
  ];

  const typesDossier = [
    { value: 'CITERNAGE', label: 'Citernage' },
    { value: 'PROCES_VOL', label: 'Procès de Vol' },
    { value: 'ESSAI_RESEAU', label: 'Essai Réseau' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If client is selected, populate client fields
    if (name === 'clientId' && value) {
      if (value === 'new') {
        // Create new client - code must be entered manually
        setIsCreatingNewClient(true);
        // Get the searched name from the event
        const searchedName = e.target.searchedName || '';
        setFormData(prev => ({
          ...prev,
          clientId: 'new',
          codeClient: '', // Empty - must be entered manually
          nomRaisonSociale: searchedName,
          adresse: '',
          telephone: '',
          email: '',
        }));
      } else {
        setIsCreatingNewClient(false);
        const selectedClient = clients.find(c => c.value === value);
        if (selectedClient) {
          setFormData(prev => ({
            ...prev,
            clientId: value,
            codeClient: selectedClient.code,
            nomRaisonSociale: selectedClient.label,
            adresse: selectedClient.adresse,
            telephone: selectedClient.telephone,
            email: selectedClient.email,
          }));
        }
      }
    } else {
      // Convert codeClient to uppercase when typing
      if (name === 'codeClient') {
        setFormData(prev => ({
          ...prev,
          [name]: value.toUpperCase()
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
      }
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.typeDossier) newErrors.typeDossier = 'Type de devis requis';
    if (formData.typeDossier && !formData.clientId) newErrors.clientId = 'Client requis';
    if (formData.clientId && !formData.codeClient) {
      newErrors.codeClient = 'Code client requis';
    } else if (formData.clientId && formData.codeClient && formData.codeClient.length !== 6) {
      newErrors.codeClient = 'Le code client doit contenir exactement 6 caractères';
    }
    if (formData.clientId && !formData.nomRaisonSociale) newErrors.nomRaisonSociale = 'Nom/Raison sociale requis';
    if (formData.clientId && !formData.adresse) newErrors.adresse = 'Adresse requise';
    if (formData.typeDossier && (!formData.nombreCiternes || formData.nombreCiternes < 1)) {
      newErrors.nombreCiternes = 'Nombre de citernes invalide';
    }
    if (formData.typeDossier && (!formData.volumeParCiterne || formData.volumeParCiterne < 1 || formData.volumeParCiterne > 500)) {
      newErrors.volumeParCiterne = 'Volume doit être entre 1 et 500 m³';
    }
    if (formData.typeDossier && (!formData.prixUnitaireM3_HT || formData.prixUnitaireM3_HT <= 0)) {
      newErrors.prixUnitaireM3_HT = 'Prix unitaire requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fonction pour obtenir le prix de transport en fonction du volume de la citerne
  const getPrixTransportSelonVolume = (volume) => {
    // Filtrer les tarifs de transport
    const tarifsTransport = tarifs.filter(t => 
      t.TypePrestation === 'TRANSPORT'
    );
    
    // Trier les tarifs de transport par volume de référence croissant
    const tarifsTriés = [...tarifsTransport].sort((a, b) => {
      if (a.VolumeReference === null) return 1;
      if (b.VolumeReference === null) return -1;
      return a.VolumeReference - b.VolumeReference;
    });
    
    // Chercher le tarif applicable selon l'intervalle de volumes
    for (let i = 0; i < tarifsTriés.length; i++) {
      const tarif = tarifsTriés[i];
      
      if (tarif.VolumeReference !== null) {
        // Déterminer les bornes de l'intervalle
        const borneInf = i === 0 ? 1 : (tarifsTriés[i-1].VolumeReference + 1);
        const borneSup = tarif.VolumeReference;
        
        // Vérifier si le volume se trouve dans l'intervalle
        if (volume >= borneInf && volume <= borneSup) {
          return tarif.PrixHT;
        }
      }
    }
    
    // Si le volume est supérieur au volume de référence le plus élevé,
    // utiliser le tarif du volume de référence le plus élevé
    const tarifsAvecVolumeRef = tarifsTriés.filter(t => t.VolumeReference !== null);
    if (tarifsAvecVolumeRef.length > 0) {
      const tarifMax = tarifsAvecVolumeRef[tarifsAvecVolumeRef.length - 1];
      if (volume > tarifMax.VolumeReference) {
        return tarifMax.PrixHT;
      }
    }
    
    // Si aucun tarif spécifique trouvé pour les intervalles, utiliser un tarif sans référence de volume
    const tarifGeneral = tarifsTransport.find(t => t.VolumeReference === null);
    if (tarifGeneral) {
      return tarifGeneral.PrixHT;
    }
    
    // Si aucun tarif applicable trouvé, retourner la valeur du formulaire ou 0
    return parseFloat(formData.prixTransportUnitaire_HT) || 0;
  };

  const calculateTotals = () => {
    const prixUnitaireM3_HT = parseFloat(formData.prixUnitaireM3_HT) || 0;
    const tauxTVA_Eau = parseFloat(formData.tauxTVA_Eau) || 0;
    const tauxTVA_Transport = parseFloat(formData.tauxTVA_Transport) || 0;
    
    // Calculate totals for all citerne rows
    let totalVolume = 0;
    let totalEauHT = 0;
    let totalTransportHT = 0;
    let totalTransportTVA = 0;
    
    citerneRows.forEach(row => {
      const nombreCiternes = parseFloat(row.nombreCiternes) || 0;
      const volumeParCiterne = parseFloat(row.volumeParCiterne) || 0;
      const volumeTotalParLigne = nombreCiternes * volumeParCiterne;
      
      totalVolume += volumeTotalParLigne;
      totalEauHT += volumeTotalParLigne * prixUnitaireM3_HT;
      
      // Calculer le prix du transport en fonction du volume de la citerne
      const prixTransportUnitaire_HT = getPrixTransportSelonVolume(volumeParCiterne);
      
      // Transport inclus individuellement pour chaque ligne de citerne
      if (row.inclureTransport) {
        const transportHT = nombreCiternes * prixTransportUnitaire_HT;
        totalTransportHT += transportHT;
        totalTransportTVA += transportHT * (tauxTVA_Transport / 100);
      }
    });
    
    const totalEauTVA = totalEauHT * (tauxTVA_Eau / 100);
    const totalEauTTC = totalEauHT + totalEauTVA;

    // Calculate transport cost (TVA calculated per row now)
    const totalTransportTTC = totalTransportHT + totalTransportTVA;

    // Total
    const totalHT = totalEauHT + totalTransportHT;
    const totalTVA = totalEauTVA + totalTransportTVA;
    const totalTTC = totalEauTTC + totalTransportTTC;

    return {
      volumeTotal: totalVolume,
      totalEauHT,
      totalEauTVA,
      totalEauTTC,
      totalTransportHT,
      totalTransportTVA,
      totalTransportTTC,
      totalHT,
      totalTVA,
      totalTTC
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const totals = calculateTotals();
      
      // Afficher une confirmation avant de soumettre
      const result = await AlertService.confirm(
        'Créer le devis', 
        'Êtes-vous sûr de vouloir créer ce devis ?', 
        'Créer', 
        'Annuler'
      );
      
      if (result.isConfirmed) {
        onSubmit({ ...formData, ...totals });
        await AlertService.success('Devis créé', 'Le devis a été créé avec succès.');
      }
    }
  };

  const totals = calculateTotals();

  const handleCancel = async () => {
    const result = await AlertService.confirm(
      'Annuler la création',
      'Êtes-vous sûr de vouloir annuler la création du devis ?',
      'Annuler',
      'Continuer'
    );
    
    if (result.isConfirmed) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="devis-form">
      <div className="form-header">
        <h2 className="form-title">Nouveau devis</h2>
        <div className="header-actions">
          <button className="btn btn-cancel" onClick={handleCancel}>Annuler</button>
          <button className="btn btn-save" type="submit">Enregistrer</button>
          <button className="btn btn-finalize">Finaliser et envoyer</button>
        </div>
      </div>

      <div className="form-section">
        <div className="section-header">
          <h3 className="section-title">Informations Générales</h3>
        </div>
        <div className="form-grid">
          <Select
            label="Type de Devis"
            name="typeDossier"
            value={formData.typeDossier}
            onChange={handleChange}
            options={typesDossier}
            placeholder="Sélectionner un type"
            required
            error={errors.typeDossier}
          />

          {formData.typeDossier && (
            <>
              <SearchableSelect
                label="Client"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                options={clients}
                placeholder="Tapez pour rechercher un client..."
                required
                error={errors.clientId}
              />

              <Input
                label="Date du Devis"
                type="date"
                name="dateDevis"
                value={formData.dateDevis}
                onChange={handleChange}
                required
              />

              <Select
                label="Statut"
                name="statut"
                value={formData.statut}
                onChange={handleChange}
                options={[
                  { value: 'EN ATTENTE', label: 'En Attente' },
                  { value: 'ACCEPTE', label: 'Accepté' },
                  { value: 'REFUSE', label: 'Refusé' },
                ]}
              />
            </>
          )}
        </div>
      </div>

      {formData.clientId && (
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">
              {isCreatingNewClient ? 'Nouveau Client' : 'Informations du Client'}
            </h3>
            {isCreatingNewClient && (
              <span className="new-client-badge">🆕 Nouveau</span>
            )}
          </div>
          <div className="form-grid">
            <Input
              label="Code Client"
              type="text"
              name="codeClient"
              value={formData.codeClient}
              onChange={handleChange}
              disabled={!isCreatingNewClient}
              required={isCreatingNewClient}
              error={errors.codeClient}
              placeholder={isCreatingNewClient ? "6 caractères (ex: CLI001)" : ""}
              maxLength="6"
              style={{ textTransform: 'uppercase' }}
            />

            <Input
              label="Nom / Raison Sociale"
              type="text"
              name="nomRaisonSociale"
              value={formData.nomRaisonSociale}
              onChange={handleChange}
              required
              error={errors.nomRaisonSociale}
              placeholder={isCreatingNewClient ? "Nom & Prénom" : ""}
            />

            <Input
              label="Téléphone"
              type="tel"
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              placeholder="0555123456"
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@example.dz"
            />
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <Input
              label="Adresse"
              type="text"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              required
              error={errors.adresse}
              placeholder="Adresse complète du client"
            />
          </div>
        </div>
      )}


      {formData.typeDossier && (
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">Détails de la Prestation</h3>
          </div>
          <div className="form-grid">


            <Input
              label="Prix Unitaire Eau HT (DZD/m³)"
              type="number"
              name="prixUnitaireM3_HT"
              value={formData.prixUnitaireM3_HT}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
              error={errors.prixUnitaireM3_HT}
              disabled={!!formData.prixUnitaireM3_HT && formData.prixUnitaireM3_HT !== ''}
            />

            <Input
              label="Taux TVA Eau (%)"
              type="number"
              name="tauxTVA_Eau"
              value={formData.tauxTVA_Eau}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.01"
              required
              disabled={!!formData.tauxTVA_Eau && formData.tauxTVA_Eau !== ''}
            />
          </div>

          <div className="section-header">
            <h3 className="section-title">Citernes</h3>
          </div>
          
          <div className="citerne-table-container">
            <table className="citerne-table">
              <thead>
                <tr>
                  <th>Quantité</th>
                  <th>Volume par Citerne (m³)</th>
                  <th>Total Volume (m³)</th>
                  <th>Inclure Transport</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {citerneRows.map((row, index) => {
                  const nombreCiternes = parseFloat(row.nombreCiternes) || 0;
                  const volumeParCiterne = parseFloat(row.volumeParCiterne) || 0;
                  const totalVolume = (nombreCiternes * volumeParCiterne).toFixed(2);
                  
                  return (
                    <tr key={row.id}>
                      <td>
                        <Input
                          type="number"
                          min="1"
                          value={row.nombreCiternes}
                          onChange={(e) => updateCiterneRow(row.id, 'nombreCiternes', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <Input
                          type="number"
                          min="1"
                          max="500"
                          step="0.01"
                          value={row.volumeParCiterne}
                          onChange={(e) => updateCiterneRow(row.id, 'volumeParCiterne', e.target.value)}
                          required
                        />
                      </td>
                      <td>{totalVolume} m³</td>
                      <td>
                        <div className="transport-checkbox-cell">
                          <input
                            type="checkbox"
                            checked={row.inclureTransport}
                            onChange={() => toggleTransportCiterne(row.id)}
                          />
                        </div>
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className="remove-row-btn"
                          onClick={() => removeCiterneRow(row.id)}
                          disabled={citerneRows.length <= 1}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <button type="button" className="add-row-btn" onClick={addCiterneRow}>
              + Ajouter une ligne
            </button>
          </div>


        </div>
      )}

      {formData.typeDossier && (
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">Calcul du Devis</h3>
          </div>
          <div className="totals-grid">
            <div className="total-item">
              <span className="total-label">Volume Total:</span>
              <span className="total-value">{totals.volumeTotal.toFixed(2)} m³</span>
            </div>
            <div className="total-item highlight">
              <span className="total-label">Total Eau HT:</span>
              <span className="total-value">{totals.totalEauHT.toFixed(2)} DZD</span>
            </div>
            <div className="total-item">
              <span className="total-label">TVA Eau:</span>
              <span className="total-value">{totals.totalEauTVA.toFixed(2)} DZD</span>
            </div>
            <div className="total-item highlight">
              <span className="total-label">Total Eau TTC:</span>
              <span className="total-value">{totals.totalEauTTC.toFixed(2)} DZD</span>
            </div>
            <div className="total-item">
              <span className="total-label">Total Transport HT:</span>
              <span className="total-value">{totals.totalTransportHT.toFixed(2)} DZD</span>
            </div>
            <div className="total-item">
              <span className="total-label">TVA Transport:</span>
              <span className="total-value">{totals.totalTransportTVA.toFixed(2)} DZD</span>
            </div>
            <div className="total-item highlight">
              <span className="total-label">Total Transport TTC:</span>
              <span className="total-value">{totals.totalTransportTTC.toFixed(2)} DZD</span>
            </div>
            <div className="total-item grand-total">
              <span className="total-label">TOTAL GÉNÉRAL TTC:</span>
              <span className="total-value">{totals.totalTTC.toFixed(2)} DZD</span>
            </div>
            <div className="total-item grand-total-words">
              <span className="total-label">Ce devis est arrêté à la somme de :</span>
              <span className="total-words">{amountToWords(totals.totalTTC)}</span>
            </div>
          </div>
        </div>
      )}

      {formData.typeDossier && (
        <div className="form-section">
          <div className="section-header">
            <h3 className="section-title">Notes (Optionnel)</h3>
          </div>
          <textarea
            className="notes-textarea"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Ajouter des notes ou commentaires..."
            rows="4"
          />
        </div>
      )}


    </form>
  );
};

export default DevisForm;
