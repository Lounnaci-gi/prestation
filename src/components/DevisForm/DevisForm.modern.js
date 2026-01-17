import React, { useState, useEffect, useRef, useCallback } from 'react';
import Input from '../../components/Input';
import Select from '../../components/Select';
import SearchableSelect from '../../components/SearchableSelect';
import Button from '../../components/Button';
import AlertService from '../../utils/alertService';
import { getAllTarifs } from '../../api/tarifsApi';
import { amountToWords } from '../../utils/numberToWords';
import './DevisForm.modern.css';

const DevisFormModern = ({ onSubmit, onCancel }) => {
  // États principaux
  const [formData, setFormData] = useState({
    // Informations client
    clientId: '',
    codeClient: '',
    nomRaisonSociale: '',
    adresse: '',
    telephone: '',
    email: '',
    
    // Informations devis
    typeDossier: '',
    dateDevis: new Date().toISOString().split('T')[0],
    statut: 'EN ATTENTE',
    notes: '',
    
    // Tarification (chargée automatiquement)
    prixUnitaireM3_HT: '',
    tauxTVA_Eau: '',
    inclureTransport: false,
    prixTransportUnitaire_HT: '0',
    tauxTVA_Transport: '19'
  });

  // États des citernes
  const [citerneRows, setCiterneRows] = useState([
    { id: Date.now(), nombreCiternes: '1', volumeParCiterne: '', inclureTransport: false }
  ]);

  // États système
  const [errors, setErrors] = useState({});
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [tarifs, setTarifs] = useState([]);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const lastCancelTime = useRef(0);

  // Chargement initial des tarifs
  useEffect(() => {
    const fetchTarifs = async () => {
      try {
        setIsLoading(true);
        const fetchedTarifs = await getAllTarifs();
        setTarifs(fetchedTarifs);
      } catch (error) {
        console.error('Erreur lors du chargement des tarifs:', error);
        AlertService.error('Erreur', 'Impossible de charger les tarifs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTarifs();
  }, []);

  // Fonctions utilitaires pour les tarifs
  const getTarifByType = useCallback((typePrestation) => {
    const tarifsActifs = tarifs.filter(t => 
      t.TypePrestation === typePrestation &&
      (!t.DateFin || new Date(t.DateFin) > new Date())
    );
    
    tarifsActifs.sort((a, b) => new Date(b.DateDebut) - new Date(a.DateDebut));
    return tarifsActifs.length > 0 ? tarifsActifs[0] : null;
  }, [tarifs]);

  const getPrixTransportSelonVolume = useCallback((volume) => {
    const tarifsTransport = tarifs.filter(t => t.TypePrestation === 'TRANSPORT');
    const tarifsTriés = [...tarifsTransport].sort((a, b) => {
      if (a.VolumeReference === null) return 1;
      if (b.VolumeReference === null) return -1;
      return a.VolumeReference - b.VolumeReference;
    });

    for (let i = 0; i < tarifsTriés.length; i++) {
      const tarif = tarifsTriés[i];
      if (tarif.VolumeReference !== null) {
        const borneInf = i === 0 ? 1 : (tarifsTriés[i-1].VolumeReference + 1);
        const borneSup = tarif.VolumeReference;
        
        if (volume >= borneInf && volume <= borneSup) {
          return tarif.PrixHT;
        }
      }
    }

    const tarifsAvecVolumeRef = tarifsTriés.filter(t => t.VolumeReference !== null);
    if (tarifsAvecVolumeRef.length > 0) {
      const tarifMax = tarifsAvecVolumeRef[tarifsAvecVolumeRef.length - 1];
      if (volume > tarifMax.VolumeReference) {
        return tarifMax.PrixHT;
      }
    }

    const tarifGeneral = tarifsTransport.find(t => t.VolumeReference === null);
    return tarifGeneral ? tarifGeneral.PrixHT : parseFloat(formData.prixTransportUnitaire_HT) || 0;
  }, [tarifs, formData.prixTransportUnitaire_HT]);

  // Mise à jour automatique des tarifs
  useEffect(() => {
    if (formData.typeDossier && tarifs.length > 0) {
      const typePrestationMap = {
        'CITERNAGE': 'CITERNAGE',
        'PROCES_VOL': 'VOL',
        'ESSAI_RESEAU': 'ESSAI'
      };
      
      const typePrestation = typePrestationMap[formData.typeDossier];
      if (typePrestation) {
        const tarif = getTarifByType(typePrestation);
        if (tarif) {
          setFormData(prev => ({
            ...prev,
            prixUnitaireM3_HT: tarif.PrixHT.toString(),
            tauxTVA_Eau: (tarif.TauxTVA * 100).toString()
          }));
        }
      }

      // Tarif transport pour CITERNAGE
      if (formData.typeDossier === 'CITERNAGE') {
        const tarifTransport = getTarifByType('TRANSPORT');
        if (tarifTransport) {
          setFormData(prev => ({
            ...prev,
            prixTransportUnitaire_HT: tarifTransport.PrixHT.toString(),
            tauxTVA_Transport: (tarifTransport.TauxTVA * 100).toString()
          }));
        }
      }
    }
  }, [formData.typeDossier, tarifs, getTarifByType]);

  // Gestion des citernes
  const addCiterneRow = useCallback(() => {
    setCiterneRows(prev => [
      ...prev,
      { id: Date.now(), nombreCiternes: '1', volumeParCiterne: '', inclureTransport: false }
    ]);
  }, []);

  const removeCiterneRow = useCallback((id) => {
    if (citerneRows.length > 1) {
      setCiterneRows(prev => prev.filter(row => row.id !== id));
    }
  }, [citerneRows.length]);

  const updateCiterneRow = useCallback((id, field, value) => {
    setCiterneRows(prev => 
      prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  }, []);

  const toggleTransportCiterne = useCallback((id) => {
    setCiterneRows(prev => 
      prev.map(row => row.id === id ? { ...row, inclureTransport: !row.inclureTransport } : row)
    );
  }, []);

  // Calcul des totaux
  const calculateTotals = useCallback(() => {
    const prixUnitaireM3_HT = parseFloat(formData.prixUnitaireM3_HT) || 0;
    const tauxTVA_Eau = parseFloat(formData.tauxTVA_Eau) || 0;
    const tauxTVA_Transport = parseFloat(formData.tauxTVA_Transport) || 0;

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

      if (row.inclureTransport) {
        const prixTransportUnitaire_HT = getPrixTransportSelonVolume(volumeParCiterne);
        const transportHT = nombreCiternes * prixTransportUnitaire_HT;
        totalTransportHT += transportHT;
        totalTransportTVA += transportHT * (tauxTVA_Transport / 100);
      }
    });

    const totalEauTVA = totalEauHT * (tauxTVA_Eau / 100);
    const totalEauTTC = totalEauHT + totalEauTVA;
    const totalTransportTTC = totalTransportHT + totalTransportTVA;
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
  }, [formData, citerneRows, getPrixTransportSelonVolume]);

  // Données mock pour les clients
  const clients = [
    { value: 'new', label: '+ Créer un nouveau client', code: 'NEW', isNew: true },
    { value: '1', label: 'Entreprise ABC', code: 'CLI001', adresse: 'Alger Centre, Algeria', telephone: '0555123456', email: 'contact@abc.dz' },
    { value: '2', label: 'Société XYZ', code: 'CLI002', adresse: 'Oran, Algeria', telephone: '0555234567', email: 'info@xyz.dz' },
    { value: '3', label: 'Client DEF', code: 'CLI003', adresse: 'Constantine, Algeria', telephone: '0555345678', email: 'def@email.dz' },
    { value: '4', label: 'Organisation GHI', code: 'CLI004', adresse: 'Annaba, Algeria', telephone: '0555456789', email: 'contact@ghi.dz' }
  ];

  const typesDossier = [
    { value: 'CITERNAGE', label: 'Citernage' },
    { value: 'PROCES_VOL', label: 'Procès de Vol' },
    { value: 'ESSAI_RESEAU', label: 'Essai Réseau' }
  ];

  // Gestion des changements de formulaire
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    if (name === 'clientId' && value) {
      if (value === 'new') {
        setIsCreatingNewClient(true);
        const searchedName = e.target.searchedName || '';
        setFormData(prev => ({
          ...prev,
          clientId: 'new',
          codeClient: '',
          nomRaisonSociale: searchedName,
          adresse: '',
          telephone: '',
          email: ''
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
            email: selectedClient.email
          }));
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'codeClient' ? value.toUpperCase() : value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [clients, errors]);

  // Validation du formulaire
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.typeDossier) newErrors.typeDossier = 'Type de devis requis';
    if (formData.typeDossier && !formData.clientId) newErrors.clientId = 'Client requis';
    if (formData.clientId && !formData.codeClient) {
      newErrors.codeClient = 'Code client requis';
    } else if (formData.clientId && formData.codeClient.length !== 6) {
      newErrors.codeClient = 'Le code client doit contenir exactement 6 caractères';
    }
    if (formData.clientId && !formData.nomRaisonSociale) newErrors.nomRaisonSociale = 'Nom/Raison sociale requis';
    if (formData.clientId && !formData.adresse) newErrors.adresse = 'Adresse requise';

    citerneRows.forEach((row, index) => {
      if (!row.nombreCiternes || parseInt(row.nombreCiternes) < 1) {
        newErrors[`citerne_${index}_nombre`] = 'Nombre invalide';
      }
      if (!row.volumeParCiterne || parseFloat(row.volumeParCiterne) < 1 || parseFloat(row.volumeParCiterne) > 500) {
        newErrors[`citerne_${index}_volume`] = 'Volume doit être entre 1 et 500 m³';
      }
    });

    if (formData.typeDossier && (!formData.prixUnitaireM3_HT || parseFloat(formData.prixUnitaireM3_HT) <= 0)) {
      newErrors.prixUnitaireM3_HT = 'Prix unitaire requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, citerneRows]);

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const totals = calculateTotals();
      
      const result = await AlertService.confirm(
        'Créer le devis', 
        'Êtes-vous sûr de vouloir créer ce devis ?', 
        'Créer', 
        'Annuler'
      );
      
      if (result.isConfirmed) {
        try {
          setIsLoading(true);
          await onSubmit({ ...formData, ...totals });
          await AlertService.success('Devis créé', 'Le devis a été créé avec succès.');
        } catch (error) {
          AlertService.error('Erreur', 'Impossible de créer le devis');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  // Annulation
  const handleCancel = async (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const now = Date.now();
    if (now - lastCancelTime.current < 300) return;
    lastCancelTime.current = now;
    
    if (isCanceling) return;
    
    setIsCanceling(true);
    
    try {
      const result = await AlertService.confirm(
        'Annuler la création',
        'Êtes-vous sûr de vouloir annuler la création du devis ?',
        'Annuler',
        'Continuer'
      );
      
      if (result.isConfirmed) {
        onCancel();
      }
    } finally {
      setIsCanceling(false);
    }
  };

  const totals = calculateTotals();

  // Rendu du composant
  return (
    <form onSubmit={handleSubmit} className="devis-form-modern">
      <div className="form-header-modern">
        <div className="header-content">
          <h1 className="form-title-modern">Nouveau Devis</h1>
          <div className="form-status-indicator">
            <span className={`status-dot ${formData.typeDossier ? 'active' : 'inactive'}`}></span>
            {formData.typeDossier ? 'Formulaire en cours' : 'Commencez par choisir un type'}
          </div>
        </div>
        <div className="header-actions-modern">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading || isCanceling}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Création...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="form-content-modern">
        {/* Section Informations Générales */}
        <SectionCard title="Informations Générales" icon="📋">
          <div className="form-grid-modern">
            <SelectField
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
                <SearchableSelectField
                  label="Client"
                  name="clientId"
                  value={formData.clientId}
                  onChange={handleChange}
                  options={clients}
                  placeholder="Tapez pour rechercher un client..."
                  required
                  error={errors.clientId}
                />

                <InputField
                  label="Date du Devis"
                  type="date"
                  name="dateDevis"
                  value={formData.dateDevis}
                  onChange={handleChange}
                  required
                />

                <SelectField
                  label="Statut"
                  name="statut"
                  value={formData.statut}
                  onChange={handleChange}
                  options={[
                    { value: 'EN ATTENTE', label: 'En Attente' },
                    { value: 'ACCEPTE', label: 'Accepté' },
                    { value: 'REFUSE', label: 'Refusé' }
                  ]}
                />
              </>
            )}
          </div>
        </SectionCard>

        {/* Section Informations Client */}
        {formData.clientId && (
          <SectionCard 
            title={isCreatingNewClient ? "Nouveau Client" : "Informations du Client"}
            icon={isCreatingNewClient ? "👤" : "👥"}
            badge={isCreatingNewClient ? "Nouveau" : null}
          >
            <div className="form-grid-modern">
              <InputField
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

              <InputField
                label="Nom / Raison Sociale"
                type="text"
                name="nomRaisonSociale"
                value={formData.nomRaisonSociale}
                onChange={handleChange}
                required
                error={errors.nomRaisonSociale}
                placeholder={isCreatingNewClient ? "Nom & Prénom" : ""}
              />

              <InputField
                label="Téléphone"
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="0555123456"
              />

              <InputField
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@example.dz"
              />
            </div>

            <div className="form-grid-modern single-column">
              <InputField
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
          </SectionCard>
        )}

        {/* Section Détails de la Prestation */}
        {formData.typeDossier && (
          <>
            <SectionCard title="Détails de la Prestation" icon="📊">
              <div className="prestation-details">
                <div className="tarification-display">
                  <TarifDisplay
                    label="Prix Unitaire Eau HT (DZD/m³)"
                    value={formData.typeDossier ? 
                      (() => {
                        const tarifType = formData.typeDossier === 'CITERNAGE' ? 'CITERNAGE' : 
                                        formData.typeDossier === 'PROCES_VOL' ? 'VOL' : 
                                        formData.typeDossier === 'ESSAI_RESEAU' ? 'ESSAI' : '';
                        const tarif = tarifType ? getTarifByType(tarifType) : null;
                        return tarif ? `${tarif.PrixHT.toFixed(2)} DZD/m³` : 'Tarif non disponible';
                      })() : 'Sélectionnez un type de devis'
                    }
                    icon="💧"
                  />
                  
                  <TarifDisplay
                    label="Taux TVA Eau (%)"
                    value={formData.typeDossier ? 
                      (() => {
                        const tarifType = formData.typeDossier === 'CITERNAGE' ? 'CITERNAGE' : 
                                        formData.typeDossier === 'PROCES_VOL' ? 'VOL' : 
                                        formData.typeDossier === 'ESSAI_RESEAU' ? 'ESSAI' : '';
                        const tarif = tarifType ? getTarifByType(tarifType) : null;
                        return tarif ? `${(tarif.TauxTVA * 100).toFixed(2)} %` : 'TVA non disponible';
                      })() : 'Sélectionnez un type de devis'
                    }
                    icon="🏷️"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section Citernes */}
            <SectionCard title="Gestion des Citernes" icon="🚛">
              <CiterneTable
                rows={citerneRows}
                onUpdateRow={updateCiterneRow}
                onToggleTransport={toggleTransportCiterne}
                onRemoveRow={removeCiterneRow}
                onAddRow={addCiterneRow}
                errors={errors}
                getPrixTransport={getPrixTransportSelonVolume}
              />
            </SectionCard>

            {/* Section Calcul du Devis */}
            <SectionCard title="Calcul du Devis" icon="🧮">
              <DevisTotals totals={totals} />
            </SectionCard>

            {/* Section Notes */}
            <SectionCard title="Notes (Optionnel)" icon="📝">
              <div className="notes-section">
                <textarea
                  className="notes-textarea-modern"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Ajouter des notes ou commentaires..."
                  rows="4"
                />
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </form>
  );
};

// Composants enfants pour une meilleure organisation
const SectionCard = ({ title, icon, children, badge }) => (
  <div className="section-card">
    <div className="section-header-modern">
      <div className="section-title-wrapper">
        <span className="section-icon">{icon}</span>
        <h2 className="section-title-modern">{title}</h2>
        {badge && <span className="section-badge">{badge}</span>}
      </div>
    </div>
    <div className="section-content-modern">
      {children}
    </div>
  </div>
);

const InputField = ({ label, error, ...props }) => (
  <div className="input-field-wrapper">
    <Input label={label} error={error} {...props} />
    {error && <span className="field-error">{error}</span>}
  </div>
);

const SelectField = ({ label, error, ...props }) => (
  <div className="input-field-wrapper">
    <Select label={label} error={error} {...props} />
    {error && <span className="field-error">{error}</span>}
  </div>
);

const SearchableSelectField = ({ label, error, ...props }) => (
  <div className="input-field-wrapper">
    <SearchableSelect label={label} error={error} {...props} />
    {error && <span className="field-error">{error}</span>}
  </div>
);

const TarifDisplay = ({ label, value, icon }) => (
  <div className="tarif-display-item">
    <div className="tarif-header">
      <span className="tarif-icon">{icon}</span>
      <span className="tarif-label">{label}</span>
    </div>
    <div className="tarif-value">{value}</div>
  </div>
);

const CiterneTable = ({ rows, onUpdateRow, onToggleTransport, onRemoveRow, onAddRow, errors, getPrixTransport }) => (
  <div className="citerne-table-wrapper">
    <div className="table-responsive">
      <table className="citerne-table-modern">
        <thead>
          <tr>
            <th>Quantité</th>
            <th>Volume par Citerne (m³)</th>
            <th>Total Volume (m³)</th>
            <th>Prix Transport Unit.</th>
            <th>Inclure Transport</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const nombreCiternes = parseFloat(row.nombreCiternes) || 0;
            const volumeParCiterne = parseFloat(row.volumeParCiterne) || 0;
            const totalVolume = (nombreCiternes * volumeParCiterne).toFixed(2);
            const prixTransport = getPrixTransport(volumeParCiterne);
            
            return (
              <tr key={row.id}>
                <td>
                  <Input
                    type="number"
                    min="1"
                    value={row.nombreCiternes}
                    onChange={(e) => onUpdateRow(row.id, 'nombreCiternes', e.target.value)}
                    error={errors[`citerne_${index}_nombre`]}
                  />
                </td>
                <td>
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    step="0.01"
                    value={row.volumeParCiterne}
                    onChange={(e) => onUpdateRow(row.id, 'volumeParCiterne', e.target.value)}
                    error={errors[`citerne_${index}_volume`]}
                  />
                </td>
                <td className="volume-total">{totalVolume} m³</td>
                <td className="prix-transport">{prixTransport.toFixed(2)} DZD</td>
                <td className="transport-toggle">
                  <label className="toggle-switch-container">
                    <input
                      type="checkbox"
                      checked={row.inclureTransport}
                      onChange={() => onToggleTransport(row.id)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </td>
                <td>
                  <button 
                    type="button" 
                    className="remove-row-btn-modern"
                    onClick={() => onRemoveRow(row.id)}
                    disabled={rows.length <= 1}
                    title="Supprimer cette ligne"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    
    <button 
      type="button" 
      className="add-row-btn-modern"
      onClick={onAddRow}
    >
      + Ajouter une citerne
    </button>
  </div>
);

const DevisTotals = ({ totals }) => (
  <div className="devis-totals-modern">
    <div className="totals-grid-modern">
      <TotalItem label="Volume Total" value={`${totals.volumeTotal.toFixed(2)} m³`} />
      <TotalItem label="Total Eau HT" value={`${totals.totalEauHT.toFixed(2)} DZD`} highlight />
      <TotalItem label="TVA Eau" value={`${totals.totalEauTVA.toFixed(2)} DZD`} />
      <TotalItem label="Total Eau TTC" value={`${totals.totalEauTTC.toFixed(2)} DZD`} highlight />
      <TotalItem label="Total Transport HT" value={`${totals.totalTransportHT.toFixed(2)} DZD`} />
      <TotalItem label="TVA Transport" value={`${totals.totalTransportTVA.toFixed(2)} DZD`} />
      <TotalItem label="Total Transport TTC" value={`${totals.totalTransportTTC.toFixed(2)} DZD`} highlight />
      <TotalItem 
        label="TOTAL GÉNÉRAL TTC" 
        value={`${totals.totalTTC.toFixed(2)} DZD`} 
        grandTotal 
      />
      <TotalItem 
        label="Montant en lettres" 
        value={amountToWords(totals.totalTTC)} 
        words 
      />
    </div>
  </div>
);

const TotalItem = ({ label, value, highlight, grandTotal, words }) => (
  <div className={`total-item-modern ${highlight ? 'highlight' : ''} ${grandTotal ? 'grand-total' : ''} ${words ? 'words' : ''}`}>
    <span className="total-label-modern">{label}</span>
    <span className="total-value-modern">{value}</span>
  </div>
);

export default DevisFormModern;