import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth';
import Navbar from './components/Navbar';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Ventes from './pages/Ventes';
import Devis from './pages/Devis';
import Factures from './pages/Factures';
import Parametres from './pages/Parametres';
import './App.css';

// Composant pour les routes protégées
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div>Chargement...</div>; // Ou un spinner
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Composant principal avec AuthProvider
const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/ventes" element={<Ventes />} />
                    <Route path="/devis" element={<Devis />} />
                    <Route path="/factures" element={<Factures />} />
                    <Route path="/parametres" element={<Parametres />} />
                  </Routes>
                </Layout>
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
