import React from 'react';
import { DevisFormModern } from '../components/DevisForm';

const TestDevisForm = () => {
  const handleSubmit = async (data) => {
    console.log('Données du formulaire:', data);
    // Simulation d'une sauvegarde
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  const handleCancel = () => {
    console.log('Formulaire annulé');
    // Redirection ou autre action
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1e293b' }}>
          🚀 Formulaire Devis Moderne - Démonstration
        </h1>
        
        <DevisFormModern 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default TestDevisForm;