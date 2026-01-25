import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [failedAttempts, setFailedAttempts] = useState(0);
  const LOCK_DURATION = 15 * 60; // 15 minutes en secondes
  const MAX_ATTEMPTS = 3;

  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Initialiser l'état de verrouillage au chargement
  useEffect(() => {
    const storedLockTime = sessionStorage.getItem('loginLockTime');
    const storedAttempts = sessionStorage.getItem('loginAttempts');
    
    if (storedLockTime) {
      const lockTime = parseInt(storedLockTime);
      const now = Date.now();
      const elapsed = Math.floor((now - lockTime) / 1000);
      const remaining = LOCK_DURATION - elapsed;
      
      if (remaining > 0) {
        setIsLocked(true);
        setRemainingTime(remaining);
        startCountdown(remaining);
      } else {
        // Déverrouiller et réinitialiser
        sessionStorage.removeItem('loginLockTime');
        sessionStorage.removeItem('loginAttempts');
        setFailedAttempts(0);
      }
    } else if (storedAttempts) {
      setFailedAttempts(parseInt(storedAttempts));
    }
  }, []);
  
  // Nettoyer l'intervalle lors du démontage du composant
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const startCountdown = (duration) => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocked(false);
          sessionStorage.removeItem('loginLockTime');
          sessionStorage.removeItem('loginAttempts');
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const validateLoginForm = () => {
    const errors = {};
    
    if (!username.trim()) {
      errors.username = 'L\'identifiant est requis';
    }
    if (!password) {
      errors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateLoginForm()) {
      return;
    }
    
    // Vérifier si l'utilisateur est verrouillé
    if (isLocked && remainingTime > 0) {
      setError(`Compte verrouillé. Veuillez réessayer dans ${Math.floor(remainingTime / 60)}m ${(remainingTime % 60).toString().padStart(2, '0')}s`);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Connexion réussie! Redirection...');
        // Réinitialiser les tentatives échouées
        sessionStorage.removeItem('loginAttempts');
        sessionStorage.removeItem('loginLockTime');
        setFailedAttempts(0);
        login(data.user);
        setTimeout(() => navigate('/'), 1000);
      } else {
        // Incrémenter le compteur de tentatives échouées
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        sessionStorage.setItem('loginAttempts', newAttempts.toString());
        
        // Vérifier si on a atteint le nombre max de tentatives
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          const lockTime = Date.now();
          sessionStorage.setItem('loginLockTime', lockTime.toString());
          setRemainingTime(LOCK_DURATION);
          startCountdown(LOCK_DURATION);
          
          setError(`⛔ Trop de tentatives échouées (${newAttempts}/${MAX_ATTEMPTS}). Accès bloqué pour 15 minutes.`);
        } else {
          const remainingAttempts = MAX_ATTEMPTS - newAttempts;
          setError(`${data.error || 'Identifiants invalides'} (Tentatives restantes: ${remainingAttempts}/${MAX_ATTEMPTS})`);
        }
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const [isRegistering, setIsRegistering] = useState(false);
  const [registerData, setRegisterData] = useState({
    nom: '',
    prenom: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [registerValidationErrors, setRegisterValidationErrors] = useState({});

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
    // Nettoyer l'erreur pour ce champ
    if (registerValidationErrors[name]) {
      setRegisterValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateRegisterForm = () => {
    const errors = {};
    
    if (!registerData.nom.trim()) {
      errors.nom = 'Le nom est requis';
    }
    if (!registerData.prenom.trim()) {
      errors.prenom = 'Le prénom est requis';
    }
    if (!registerData.email.trim()) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerData.email)) {
      errors.email = 'L\'email n\'est pas valide';
    }
    if (!registerData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (registerData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    setRegisterValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateRegisterForm()) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: registerData.nom,
          prenom: registerData.prenom,
          email: registerData.email,
          password: registerData.password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Inscription réussie! Redirection vers la connexion...');
        setTimeout(() => {
          setIsRegistering(false);
          setUsername(registerData.email);
          setPassword('');
          setRegisterData({
            nom: '',
            prenom: '',
            email: '',
            password: '',
            confirmPassword: ''
          });
        }, 1500);
      } else {
        setError(data.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="login-container">
        <div className="login-wrapper">
          <div className="login-header">
            <h1>Création de Compte</h1>
            <p>Rejoignez-nous pour gérer votre activité</p>
          </div>
          
          <div className="login-form-card">
            <form onSubmit={handleRegisterSubmit}>
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nom">Nom *</label>
                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    value={registerData.nom}
                    onChange={handleRegisterChange}
                    placeholder="Votre nom"
                    required
                    className={registerValidationErrors.nom ? 'error' : ''}
                  />
                  {registerValidationErrors.nom && <span className="field-error">{registerValidationErrors.nom}</span>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="prenom">Prénom *</label>
                  <input
                    type="text"
                    id="prenom"
                    name="prenom"
                    value={registerData.prenom}
                    onChange={handleRegisterChange}
                    placeholder="Votre prénom"
                    required
                    className={registerValidationErrors.prenom ? 'error' : ''}
                  />
                  {registerValidationErrors.prenom && <span className="field-error">{registerValidationErrors.prenom}</span>}
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={registerData.email}
                  onChange={handleRegisterChange}
                  placeholder="votre.email@exemple.com"
                  required
                  className={registerValidationErrors.email ? 'error' : ''}
                />
                {registerValidationErrors.email && <span className="field-error">{registerValidationErrors.email}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mot de passe *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={registerData.password}
                    onChange={handleRegisterChange}
                    placeholder="Au moins 6 caractères"
                    required
                    className={registerValidationErrors.password ? 'error' : ''}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {registerValidationErrors.password && <span className="field-error">{registerValidationErrors.password}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer mot de passe *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterChange}
                  placeholder="Confirmez votre mot de passe"
                  required
                  className={registerValidationErrors.confirmPassword ? 'error' : ''}
                />
                {registerValidationErrors.confirmPassword && <span className="field-error">{registerValidationErrors.confirmPassword}</span>}
              </div>
              
              <button type="submit" disabled={loading} className="login-button">
                {loading ? '⏳ Inscription en cours...' : '✓ S\'inscrire'}
              </button>
              
              <div className="switch-form">
                <p>Vous avez déjà un compte ?</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="switch-link"
                >
                  Se connecter maintenant
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-header">
          <h1>Connexion</h1>
          <p>Accédez à votre espace de gestion</p>
        </div>
        
        <div className="login-form-card">
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            {isLocked && remainingTime > 0 && (
              <div className="lockout-message">
                <div className="lockout-header">⛔ Accès bloqué</div>
                <div className="lockout-timer">
                  {formatTime(remainingTime)}
                </div>
                <div className="lockout-info">
                  <div>Trop de tentatives de connexion échouées</div>
                  <div style={{fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9}}>
                    Veuillez réessayer dans {Math.floor(remainingTime / 60)} minute{Math.floor(remainingTime / 60) > 1 ? 's' : ''} et {(remainingTime % 60)} seconde{(remainingTime % 60) > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="username">Identifiant *</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (validationErrors.username) {
                    setValidationErrors(prev => ({
                      ...prev,
                      username: ''
                    }));
                  }
                }}
                placeholder="Votre identifiant ou email"
                required
                className={validationErrors.username ? 'error' : ''}
                disabled={isLocked && remainingTime > 0}
              />
              {validationErrors.username && <span className="field-error">{validationErrors.username}</span>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Mot de passe *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors(prev => ({
                        ...prev,
                        password: ''
                      }));
                    }
                  }}
                  placeholder="Votre mot de passe"
                  required
                  className={validationErrors.password ? 'error' : ''}
                  disabled={isLocked && remainingTime > 0}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Masquer' : 'Afficher'}
                  disabled={isLocked && remainingTime > 0}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {validationErrors.password && <span className="field-error">{validationErrors.password}</span>}
            </div>
            
            <button 
              type="submit" 
              disabled={loading || (isLocked && remainingTime > 0)} 
              className="login-button"
            >
              {loading ? '⏳ Connexion en cours...' : (isLocked && remainingTime > 0) ? '🔒 Compte verrouillé' : '✓ Se connecter'}
            </button>
            
            <div className="switch-form">
              <p>Pas encore de compte ?</p>
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(true);
                  setError('');
                  setSuccess('');
                }}
                className="switch-link"
              >
                S\'inscrire maintenant
              </button>
            </div>
          </form>
        </div>
        
        <div className="login-footer">
          <p>© 2026 Gestion Prestation. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;