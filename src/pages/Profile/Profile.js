import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Swal from 'sweetalert2';
import AlertService from '../../utils/alertService';
import './Profile.css';

const Profile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    codeUtilisateur: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        nom: user.Nom || '',
        prenom: user.Prenom || '',
        email: user.Email || '',
        codeUtilisateur: user.CodeUtilisateur || ''
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    // Afficher une boîte de dialogue de confirmation
    const result = await Swal.fire({
      title: 'Confirmation',
      text: 'Voulez-vous enregistrer les modifications ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non',
      reverseButtons: true
    });
    
    if (!result.isConfirmed) {
      // L'utilisateur a annulé, ne rien faire
      return;
    }
    
    setLoading(true);
    setMessage('');
    setError('');

    try {
      // Mettre à jour les informations du profil
      const profileResponse = await fetch(`${process.env.REACT_APP_API_URL}/users/profile?userId=${user.UserID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom || '',
          prenom: formData.prenom || '',
          email: formData.email || '',
          codeUtilisateur: formData.codeUtilisateur || ''
        })
      });

      const profileResult = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileResult.error || 'Erreur lors de la mise à jour du profil');
      }

      // Mettre à jour les données utilisateur dans le contexte
      const updatedUser = { ...user, ...formData };
      login(updatedUser); // Met à jour le contexte d'authentification

      // Si les champs de mot de passe sont remplis, mettre à jour le mot de passe
      if (passwordData.newPassword || passwordData.currentPassword || passwordData.confirmNewPassword) {
        // Vérifier si tous les champs de mot de passe sont remplis
        if (!passwordData.currentPassword) {
          setError('Veuillez entrer votre mot de passe actuel');
          setLoading(false);
          return;
        }
        
        if (!passwordData.newPassword) {
          setError('Veuillez entrer votre nouveau mot de passe');
          setLoading(false);
          return;
        }
        
        if (!passwordData.confirmNewPassword) {
          setError('Veuillez confirmer votre nouveau mot de passe');
          setLoading(false);
          return;
        }
        
        // Validation côté client
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
          setError('Les nouveaux mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }

        if (passwordData.newPassword.length < 6) {
          setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
          setLoading(false);
          return;
        }

        const passwordResponse = await fetch(`${process.env.REACT_APP_API_URL}/users/change-password?userId=${user.UserID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          })
        });

        const passwordResult = await passwordResponse.json();

        if (!passwordResponse.ok) {
          throw new Error(passwordResult.error || 'Erreur lors du changement de mot de passe');
        }
      }

      setMessage('Profil mis à jour avec succès!');
      
      // Réinitialiser les champs de mot de passe après la mise à jour
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      
    } catch (err) {
      setError(err.message || 'Erreur de connexion au serveur');
      console.error('Erreur de mise à jour du profil:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">Mon Profil</h1>
        <p className="page-subtitle">Gérez vos informations personnelles et votre mot de passe</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="profile-container">
        <div className="profile-form-section">
          <Card title="Informations Personnelles" className="profile-card">
            <div className="card-content">
              <form onSubmit={handleUpdateProfile} className="personal-info-form">
                <div className="profile-section">
                  <h3 className="section-title">Informations Personnelles</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <Input
                        label="Nom"
                        type="text"
                        name="nom"
                        value={formData.nom}
                        onChange={handleInputChange}
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Prénom"
                        type="text"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleInputChange}
                        placeholder="Votre prénom"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="votre.email@exemple.com"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Identifiant (Nom d'utilisateur)"
                        type="text"
                        name="codeUtilisateur"
                        value={formData.codeUtilisateur}
                        onChange={handleInputChange}
                        placeholder="Votre identifiant"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="divider"></div>
                
                <div className="profile-section">
                  <h3 className="section-title">Sécurité du Compte</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <Input
                        label="Mot de passe actuel"
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Entrez votre mot de passe actuel"
                      />
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Nouveau mot de passe"
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Entrez votre nouveau mot de passe"
                      />
                    </div>
                    
                    <div className="form-group">
                      <Input
                        label="Confirmer le nouveau mot de passe"
                        type="password"
                        name="confirmNewPassword"
                        value={passwordData.confirmNewPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirmez votre nouveau mot de passe"
                      />
                    </div>
                  </div>
                  <p className="password-hint">Laissez les champs de mot de passe vides si vous ne souhaitez pas le modifier</p>
                </div>
                
                <div className="form-actions">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={loading}
                    className="save-button"
                  >
                    {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;