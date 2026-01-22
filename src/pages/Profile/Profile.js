import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Button from '../../components/Button';
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
  const [showPasswordForm, setShowPasswordForm] = useState(false);
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
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/profile?userId=${user.UserID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          email: formData.email,
          codeUtilisateur: formData.codeUtilisateur
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Profil mis à jour avec succès!');
        
        // Mettre à jour les données utilisateur dans le contexte
        const updatedUser = { ...user, ...formData };
        login(updatedUser); // Met à jour le contexte d'authentification
      } else {
        setError(result.error || 'Erreur lors de la mise à jour du profil');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur de mise à jour du profil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

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

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/users/change-password?userId=${user.UserID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Mot de passe mis à jour avec succès!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });
        setShowPasswordForm(false); // Fermer le formulaire après mise à jour réussie
      } else {
        setError(result.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur de changement de mot de passe:', err);
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
                <div className="form-row">
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
                </div>
                
                <div className="form-row">
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

          <Card title="Sécurité du Compte" className="security-card">
            <div className="card-content">
              <div className="password-section">
                {!showPasswordForm ? (
                  <div className="password-prompt">
                    <p className="password-description">Souhaitez-vous modifier votre mot de passe ?</p>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowPasswordForm(true)}
                      className="change-password-btn"
                    >
                      Changer le mot de passe
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="password-form">
                    <div className="form-row">
                      <div className="form-group">
                        <Input
                          label="Mot de passe actuel"
                          type="password"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          placeholder="Entrez votre mot de passe actuel"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <Input
                          label="Nouveau mot de passe"
                          type="password"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          placeholder="Entrez votre nouveau mot de passe"
                          required
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
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-actions password-actions">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmNewPassword: ''
                          });
                        }}
                        className="cancel-btn"
                      >
                        Annuler
                      </Button>
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={loading}
                        className="save-password-btn"
                      >
                        {loading ? 'Mise à jour...' : 'Enregistrer le mot de passe'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;