// API pour la gestion des paramètres de l'entreprise

export const getParametresEntreprise = async () => {
  try {
    const response = await fetch('/api/parametres-entreprise');
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des paramètres');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur getParametresEntreprise:', error);
    throw error;
  }
};

export const updateParametresEntreprise = async (parametres) => {
  try {
    const response = await fetch('/api/parametres-entreprise', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parametres)
    });
    if (!response.ok) {
      throw new Error('Erreur lors de la mise à jour des paramètres');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur updateParametresEntreprise:', error);
    throw error;
  }
};

export const createParametresEntreprise = async (parametres) => {
  try {
    const response = await fetch('/api/parametres-entreprise', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parametres)
    });
    if (!response.ok) {
      throw new Error('Erreur lors de la création des paramètres');
    }
    return await response.json();
  } catch (error) {
    console.error('Erreur createParametresEntreprise:', error);
    throw error;
  }
};
