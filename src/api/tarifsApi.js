// API pour la gestion des tarifs (appel réel à l'API backend)

// Fonction utilitaire pour les appels API
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// Fonction pour récupérer tous les tarifs depuis la base de données
export const getAllTarifs = async () => {
  try {
    const response = await apiCall('/tarifs-historique', {
      method: 'GET'
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Fonction pour ajouter un nouveau tarif dans la base de données
export const addTarif = async (tarif) => {
  try {
    const response = await apiCall('/tarifs-historique', {
      method: 'POST',
      body: JSON.stringify(tarif)
    });
    
    // Vérifier si c'est une réponse de simulation
    if (response.simulation) {
      // Retourner le tarif simulé
      return response.tarif;
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Fonction pour mettre à jour un tarif dans la base de données
export const updateTarif = async (id, tarif) => {
  try {
    const response = await apiCall(`/tarifs-historique/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tarif)
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

// Fonction pour supprimer un tarif de la base de données
export const deleteTarif = async (id) => {
  try {
    const response = await apiCall(`/tarifs-historique/${id}`, {
      method: 'DELETE'
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};