import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Ventes from './pages/Ventes';
import Devis from './pages/Devis';
import Factures from './pages/Factures';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/ventes" element={<Ventes />} />
            <Route path="/devis" element={<Devis />} />
            <Route path="/factures" element={<Factures />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App;
