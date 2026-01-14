import React, { useState } from 'react';
import Input from '../../components/Input';
import Select from '../../components/Select';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import AlertService from '../../utils/alertService';
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
    nombreCiternes: '1',
    volumeParCiterne: '',
    prixUnitaireM3_HT: '',
    tauxTVA_Eau: '19',
    prixTransportUnitaire_HT: '0',
    tauxTVA_Transport: '19',
    dateDevis: new Date().toISOString().split('T')[0],
    statut: 'EN ATTENTE',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);

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
    { value: 'VENTE', label: 'Citernage' },
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

  const calculateTotals = () => {
    const nombreCiternes = parseFloat(formData.nombreCiternes) || 0;
    const volumeParCiterne = parseFloat(formData.volumeParCiterne) || 0;
    const prixUnitaireM3_HT = parseFloat(formData.prixUnitaireM3_HT) || 0;
    const tauxTVA_Eau = parseFloat(formData.tauxTVA_Eau) || 0;
    const prixTransportUnitaire_HT = parseFloat(formData.prixTransportUnitaire_HT) || 0;
    const tauxTVA_Transport = parseFloat(formData.tauxTVA_Transport) || 0;

    // Calculate water cost
    const volumeTotal = nombreCiternes * volumeParCiterne;
    const totalEauHT = volumeTotal * prixUnitaireM3_HT;
    const totalEauTVA = totalEauHT * (tauxTVA_Eau / 100);
    const totalEauTTC = totalEauHT + totalEauTVA;

    // Calculate transport cost
    const totalTransportHT = nombreCiternes * prixTransportUnitaire_HT;
    const totalTransportTVA = totalTransportHT * (tauxTVA_Transport / 100);
    const totalTransportTTC = totalTransportHT + totalTransportTVA;

    // Total
    const totalHT = totalEauHT + totalTransportHT;
    const totalTVA = totalEauTVA + totalTransportTVA;
    const totalTTC = totalEauTTC + totalTransportTTC;

    return {
      volumeTotal,
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
        <h2 className="form-title">Créer un Nouveau Devis</h2>
        <p className="form-subtitle">Remplissez les informations ci-dessous pour générer un devis</p>
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
              placeholder={isCreatingNewClient ? "Nom & prenom ou Raison Sociale" : ""}
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


      <div className="form-section">
        <div className="section-header">
          <h3 className="section-title">Détails de la Prestation</h3>
        </div>
        <div className="form-grid">
          <Input
            label="Nombre de Citernes"
            type="number"
            name="nombreCiternes"
            value={formData.nombreCiternes}
            onChange={handleChange}
            min="1"
            required
            error={errors.nombreCiternes}
          />

          <Input
            label="Volume par Citerne (m³)"
            type="number"
            name="volumeParCiterne"
            value={formData.volumeParCiterne}
            onChange={handleChange}
            min="1"
            max="500"
            step="0.01"
            required
            error={errors.volumeParCiterne}
          />

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
          />

          <Input
            label="Prix Transport Unitaire HT (DZD)"
            type="number"
            name="prixTransportUnitaire_HT"
            value={formData.prixTransportUnitaire_HT}
            onChange={handleChange}
            min="0"
            step="0.01"
          />

          <Input
            label="Taux TVA Transport (%)"
            type="number"
            name="tauxTVA_Transport"
            value={formData.tauxTVA_Transport}
            onChange={handleChange}
            min="0"
            max="100"
            step="0.01"
          />
        </div>
      </div>

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
        </div>
      </div>

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

      <div className="form-actions">
        <Button type="button" variant="ghost" onClick={handleCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary">
          Créer le Devis
        </Button>
      </div>
    </form>
  );
};

export default DevisForm;
