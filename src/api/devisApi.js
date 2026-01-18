import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || ''; // Utiliser le proxy configuré dans package.json

/**
 * Crée un nouveau devis
 */
export const createDevis = async (devisData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/devis`, devisData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la création du devis:', error);
    throw error.response?.data || { error: 'Erreur serveur lors de la création du devis' };
  }
};

/**
 * Récupère tous les devis
 */
export const getAllDevis = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/devis`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error);
    throw error.response?.data || { error: 'Erreur serveur lors de la récupération des devis' };
  }
};

/**
 * Met à jour un devis existant
 */
export const updateDevis = async (id, devisData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/devis/${id}`, devisData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du devis:', error);
    throw error.response?.data || { error: 'Erreur serveur lors de la mise à jour du devis' };
  }
};

/**
 * Récupère un devis spécifique par son ID
 */
export const getDevisById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/devis/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error);
    throw error.response?.data || { error: 'Erreur serveur lors de la récupération du devis' };
  }
};

/**
 * Supprime un devis
 */
export const deleteDevis = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/devis/${id}`);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la suppression du devis:', error);
    throw error.response?.data || { error: 'Erreur serveur lors de la suppression du devis' };
  }
};