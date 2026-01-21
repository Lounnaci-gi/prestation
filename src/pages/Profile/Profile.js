import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AlertService from '../../utils/alertService';
import './Profile.css';

const Profile = () => {
  const { user, login } = useAuth();
  const [profileData, setProfileData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setProfileData({
        nom: user.Nom || '',
        prenom: user.Prenom || '',
        email: user.Email || '',
        telephone: user.Telephone || '',
        poste: user.Poste || '',
      });
      setLoading(false);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Simuler la mise à jour du profil (dans une vraie application, cela irait à une API)
      const updatedUser = {
        ...user,
        Nom: profileData.nom,
        Prenom: profileData.prenom,
        Email: profileData.email,
        Telephone: profileData.telephone,
        Poste: profileData.poste,
      };
      
      // Sauvegarder dans le contexte d'authentification
      login(updatedUser);
      
      // Sauvegarder dans localStorage aussi
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      await AlertService.success('Profil mis à jour', 'Votre profil a été mis à jour avec succès.');
    } catch (error) {
      await AlertService.error('Erreur', 'Impossible de mettre à jour le profil. Veuillez réessayer.');
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="page-header">
          <h1 className="page-title">Mon Profil</h1>
          <p className="page-subtitle">Chargement des informations en cours...</p>
        </div>
        <div className="loading-spinner">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Mon Profil</h1>
        <p className="page-subtitle">Gérez vos informations personnelles</p>
      </div>

      <Card title="Informations Personnelles" style={{ marginTop: '1rem' }}>
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-grid">
            <Input
              label="Nom"
              type="text"
              name="nom"
              value={profileData.nom}
              onChange={handleChange}
              placeholder="Votre nom"
              required
            />
            
            <Input
              label="Prénom"
              type="text"
              name="prenom"
              value={profileData.prenom}
              onChange={handleChange}
              placeholder="Votre prénom"
              required
            />
            
            <Input
              label="Email"
              type="email"
              name="email"
              value={profileData.email}
              onChange={handleChange}
              placeholder="votre.email@exemple.com"
              required
            />
            
            <Input
              label="Téléphone"
              type="tel"
              name="telephone"
              value={profileData.telephone}
              onChange={handleChange}
              placeholder="0555123456"
            />
            
            <Input
              label="Poste"
              type="text"
              name="poste"
              value={profileData.poste}
              onChange={handleChange}
              placeholder="Votre poste"
            />
          </div>
          
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <Button type="submit" variant="primary">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Profile;