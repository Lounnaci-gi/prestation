import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);

  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Nettoyer l'intervalle lors du démontage du composant
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier si l'utilisateur est verrouillé
    if (isLocked && remainingTime > 0) {
      setError(`Compte verrouillé. Veuillez réessayer dans ${Math.floor(remainingTime / 60)}:${(remainingTime % 60).toString().padStart(2, '0')}`);
      return;
    }
    
    setLoading(true);
    setError('');

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
        // Utiliser le contexte d'authentification pour gérer la connexion
        login(data.user);
        navigate('/dashboard'); // Rediriger vers le dashboard
      } else if (response.status === 429) {
        // Gérer le cas de rate limiting
        setIsLocked(true);
        setRemainingTime(data.remainingTime || 900); // 900 secondes = 15 minutes par défaut
        
        // Démarrer le compte à rebours
        if (countdownInterval) {
          clearInterval(countdownInterval);
        }
        
        const interval = setInterval(() => {
          setRemainingTime(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsLocked(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        setCountdownInterval(interval);
        
        // Afficher un message plus informatif en fonction du nombre de tentatives
        let errorMessage = data.error || 'Compte verrouillé temporairement';
        if (data.attempts) {
          if (data.attempts > 5) {
            errorMessage = `Trop de tentatives infructueuses (${data.attempts}). Verrouillé pour 1 heure.`;
          } else if (data.attempts > 3) {
            errorMessage = `Trop de tentatives infructueuses (${data.attempts}). Verrouillé pour 30 minutes.`;
          } else {
            errorMessage = `Trop de tentatives infructueuses (${data.attempts}). Verrouillé pour 15 minutes.`;
          }
        }
        setError(errorMessage);
      } else {
        setError(data.error || 'Identifiants invalides');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur de login:', err);
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

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation des données
    if (registerData.password !== registerData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
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
        // Inverser pour aller à la page de login après inscription réussie
        setIsRegistering(false);
        setUsername(registerData.email);
        setPassword('');
      } else {
        setError(data.error || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
      console.error('Erreur d\'inscription:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isRegistering) {
    return (
      <div className="login-container">
        <div className="login-form-card">
          <h2>Inscription</h2>
          <form onSubmit={handleRegisterSubmit}>
            {(error && !(isLocked && remainingTime > 0)) && <div className="error-message">{error}</div>}
            {isLocked && remainingTime > 0 && (
              <div className="error-message lockout-message">
                <div className="lockout-header">Système verrouillé</div>
                <div className="lockout-timer">
                  Temps restant: {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                </div>
                <div className="lockout-info">Veuillez réessayer plus tard</div>
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="nom">Nom:</label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={registerData.nom}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="prenom">Prénom:</label>
              <input
                type="text"
                id="prenom"
                name="prenom"
                value={registerData.prenom}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                name="email"
                value={registerData.email}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Mot de passe:</label>
              <input
                type="password"
                id="password"
                name="password"
                value={registerData.password}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmer mot de passe:</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={registerData.confirmPassword}
                onChange={handleRegisterChange}
                required
              />
            </div>
            
            <button type="submit" disabled={loading} className="login-button">
              {loading ? 'Inscription...' : 'S\'inscrire'}
            </button>
            
            <div className="switch-form">
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="switch-link"
              >
                Déjà un compte ? Se connecter
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form-card">
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit}>
          {(error && !(isLocked && remainingTime > 0)) && <div className="error-message">{error}</div>}
          {isLocked && remainingTime > 0 && (
            <div className="error-message lockout-message">
              <div className="lockout-header">Compte verrouillé</div>
              <div className="lockout-timer">
                Temps restant: {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
              </div>
              <div className="lockout-info">Veuillez réessayer plus tard</div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="username">Identifiant:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Mot de passe:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" disabled={loading || (isLocked && remainingTime > 0)} className="login-button">
            {loading ? 'Connexion...' : (isLocked && remainingTime > 0) ? 'Compte verrouillé' : 'Se connecter'}
          </button>
          
          <div className="switch-form">
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="switch-link"
            >
              Pas encore de compte ? S'inscrire
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;