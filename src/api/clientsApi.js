import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || ''; // Utiliser le proxy configuré dans package.json

/**
 * Récupère tous les clients depuis la base de données
 */
export const getAllClients = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/clients`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Erreur serveur lors de la récupération des clients' };
  }
};