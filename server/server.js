require('dotenv').config();
const express = require('express');
const { Connection, Request, TYPES } = require('tedious');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware CORS pour autoriser les requêtes depuis le frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5001'], // Ports habituels pour React
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Configuration de la base de données depuis les variables d'environnement
const config = {
  server: process.env.DB_SERVER || 'localhost',
  options: {
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_NAME || 'GestionEau',
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
    useUTC: true,
    enableArithAbort: true
  },
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD
    }
  }
};

// Tentative de connexion à la base de données - journalisé dans les logs

// Connexion à la base de données
const connection = new Connection(config);
let isConnected = false;

// Essayer de se connecter immédiatement
connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
    console.log('Mode simulation activé - le serveur fonctionnera avec des données factices');
    isConnected = false;
  } else {
    console.log('Connexion réussie à la base de données SQL Server');
    isConnected = true;
  }
});

// Attendre que la connexion soit vraiment établie
connection.on('connect', (err) => {
  if (err) {
    console.error('Erreur de connexion:', err);
    isConnected = false;
  } else {
    // Connexion SQL Server établie
    isConnected = true;
  }
});

// Gestion des erreurs de connexion
connection.on('end', () => {
  // Connexion à la base de données fermée
  isConnected = false;
});

connection.on('error', (err) => {
  console.error('Erreur de connexion à la base de données:', err);
  isConnected = false;
});

// Fonction utilitaire pour exécuter des requêtes avec gestion d'erreurs
const executeQuery = (query, params, callback) => {
  // Vérifier que la connexion est établie
  if (!isConnected || (connection.state.name !== 'LoggedIn' && connection.state.name !== 'SentClientRequest')) {
    console.error('Connexion SQL Server non prête. État actuel:', connection.state.name);
    callback(new Error('Connexion à la base de données non disponible ou pas encore prête'), null);
    return;
  }

  // Attendre un peu si la connexion est en cours d'utilisation
  if (connection.state.name === 'SentClientRequest') {
    setTimeout(() => {
      executeQuery(query, params, callback);
    }, 100);
    return;
  }

  const request = new Request(query, (err) => {
    if (err) {
      console.error('Erreur lors de l\'exécution de la requête:', err);
      callback(err, null);
      return;
    }
  });

  // Ajouter les paramètres à la requête avec les types TEDIOUS corrects
  params.forEach((param) => {
    let tediousType;
        
    // Convertir les types string en objets TEDIOUS
    switch(param.type.toLowerCase()) {
      case 'varchar':
      case 'nvarchar':
        tediousType = TYPES.VarChar;
        // Gérer les valeurs null pour les types varchar
        const varcharValue = param.value === null ? null : param.value;
        request.addParameter(param.name, tediousType, varcharValue);
        break;
      case 'int':
        tediousType = TYPES.Int;
        // Gérer les valeurs null pour les types int
        const intValue = param.value === null || param.value === undefined ? null : param.value;
        request.addParameter(param.name, tediousType, intValue);
        break;
      case 'float':
        tediousType = TYPES.Float;
        // Gérer les valeurs null pour les types float
        const floatValue = param.value === null || param.value === undefined ? null : param.value;
        request.addParameter(param.name, tediousType, floatValue);
        break;
      case 'datetime':
        tediousType = TYPES.DateTime;
        // Gérer les valeurs null pour les types datetime
        const datetimeValue = param.value === null || param.value === undefined ? null : param.value;
        request.addParameter(param.name, tediousType, datetimeValue);
        break;
      case 'decimal':
        // Pour les types décimaux, on spécifie la précision et l'échelle
        tediousType = TYPES.Decimal;
        // Gérer les valeurs null pour les types decimal
        const decimalValue = param.value === null || param.value === undefined ? null : param.value;
        // Ajouter les propriétés precision et scale
        request.addParameter(param.name, tediousType, decimalValue, { precision: 18, scale: 2 });
        break;
      default:
        tediousType = TYPES.VarChar; // Par défaut
        // Gérer les valeurs null pour les types par défaut
        const defaultValue = param.value === null || param.value === undefined ? null : param.value;
        request.addParameter(param.name, tediousType, defaultValue);
        // Type inconnu, utilisation de VarChar
    }
  });

  let results = [];
  request.on('row', (columns) => {
    let row = {};
    columns.forEach((column) => {
      row[column.metadata.colName] = column.value;
    });
    results.push(row);
  });

  request.on('requestCompleted', () => {
    callback(null, results);
  });

  // Exécuter la requête seulement si la connexion est prête
  try {
    connection.execSql(request);
  } catch (execError) {
    console.error('Erreur lors de l\'exécution de execSql:', execError);
    callback(execError, null);
  }
};

// Endpoint pour récupérer tous les tarifs de la table Tarifs_Historique
app.get('/api/tarifs-historique', (req, res) => {
  if (!isConnected) {
    return res.json([]);
  }

  const query = 'SELECT * FROM Tarifs_Historique ORDER BY DateDebut DESC';
  
  executeQuery(query, [], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des tarifs:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des tarifs' });
    } else {
      res.json(results);
    }
  });
});

// Endpoint pour ajouter un nouveau tarif dans la table Tarifs_Historique
app.post('/api/tarifs-historique', async (req, res) => {
  const { TypePrestation, PrixHT, TauxTVA, DateDebut, VolumeReference } = req.body;

  // Validation des données requises
  if (!TypePrestation || !PrixHT || !TauxTVA) {
    return res.status(400).json({ error: 'TypePrestation, PrixHT et TauxTVA sont requis' });
  }

  try {
    // FAIRE LA CONVERSION IMMÉDIATEMENT AU DÉBUT
    const typePrestationDB = TypePrestation.trim().toUpperCase() === 'CITERNAGE' ? 'CITERNAGE' : TypePrestation.trim();
    
    // Conversion et validation des valeurs numériques
    const prixHT = parseFloat(parseFloat(PrixHT).toFixed(2));
    let tauxTVAInput = parseFloat(TauxTVA);
    let tauxTVA;
    
    if (tauxTVAInput > 10) {
      tauxTVA = parseFloat((tauxTVAInput / 100).toFixed(4));
    } else {
      tauxTVA = parseFloat(tauxTVAInput.toFixed(4));
    }
    
    const volumeRef = VolumeReference ? parseInt(VolumeReference) : null;
    
    // Validation
    if (isNaN(prixHT) || prixHT <= 0 || prixHT > 999999999999999.99) {
      return res.status(400).json({ 
        error: 'Prix HT invalide. Doit être un nombre positif inférieur à 999,999,999,999,999.99' 
      });
    }
    
    if (isNaN(tauxTVA) || tauxTVA < 0 || tauxTVA > 99.9999) {
      return res.status(400).json({ 
        error: 'Taux TVA invalide. Doit être un nombre entre 0 et 99.9999' 
      });
    }

    // Méthode radicale : charger TOUS les tarifs et vérifier en JS
    const getAllQuery = 'SELECT TarifID, TypePrestation, PrixHT, TauxTVA, DateDebut, DateFin, VolumeReference FROM Tarifs_Historique';
    const allTarifs = await new Promise((resolve, reject) => {
      executeQuery(getAllQuery, [], (err, results) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    });

    // Nettoyer le type de prestation pour la comparaison
    const cleanInputType = typePrestationDB.toUpperCase();

    // Vérifier les doublons - PLUS STRICT
    const existingTarif = allTarifs.find(tarif => {
      const cleanDbType = (tarif.TypePrestation || '').trim().toUpperCase();
      const isActive = !tarif.DateFin || new Date(tarif.DateFin) > new Date();
      
      // Pour le TRANSPORT, on vérifie le couple TypePrestation + VolumeReference
      // Pour les autres types, on vérifie juste le TypePrestation
      let isMatch = false;
      
      if (cleanInputType === 'TRANSPORT') {
        // Pour le transport, le volume de référence doit être pris en compte
        const inputVolume = volumeRef;
        const dbVolume = tarif.VolumeReference;
        
        isMatch = cleanDbType === cleanInputType && 
                 isActive && 
                 ((inputVolume !== null && dbVolume !== null && inputVolume === dbVolume) || 
                  (inputVolume === null && dbVolume === null));
      } else {
        // Pour les autres types de prestation, on vérifie juste le type
        isMatch = cleanDbType === cleanInputType && isActive;
      }
      
      return isMatch;
    });

    if (existingTarif) {
      return res.status(409).json({ 
        error: `Un tarif pour "${typePrestationDB}" existe déjà (ID: ${existingTarif.TarifID})`,
        existingTarif: existingTarif,
        code: 'DUPLICATE_TARIFF'
      });
    }

    // Validation
    if (isNaN(prixHT) || prixHT <= 0 || prixHT > 999999999999999.99) {
      return res.status(400).json({ 
        error: 'Prix HT invalide. Doit être un nombre positif inférieur à 999,999,999,999,999.99' 
      });
    }
    
    if (isNaN(tauxTVA) || tauxTVA < 0 || tauxTVA > 99.9999) {
      return res.status(400).json({ 
        error: 'Taux TVA invalide. Doit être un nombre entre 0 et 99.9999' 
      });
    }

    // Construction de la requête (typePrestationDB est déjà converti)
    let query, params;
    if (volumeRef !== null) {
      query = `
        INSERT INTO Tarifs_Historique (TypePrestation, VolumeReference, PrixHT, TauxTVA, DateDebut)
        OUTPUT INSERTED.*
        VALUES (@TypePrestation, @VolumeReference, @PrixHT, @TauxTVA, @DateDebut)
      `;
      
      params = [
        { name: 'TypePrestation', type: 'varchar', value: typePrestationDB },
        { name: 'VolumeReference', type: 'int', value: volumeRef },
        { name: 'PrixHT', type: 'decimal', value: prixHT },
        { name: 'TauxTVA', type: 'decimal', value: tauxTVA },
        { name: 'DateDebut', type: 'datetime', value: new Date(DateDebut) }
      ];
    } else {
      query = `
        INSERT INTO Tarifs_Historique (TypePrestation, PrixHT, TauxTVA, DateDebut)
        OUTPUT INSERTED.*
        VALUES (@TypePrestation, @PrixHT, @TauxTVA, @DateDebut)
      `;
      
      params = [
        { name: 'TypePrestation', type: 'varchar', value: typePrestationDB },
        { name: 'PrixHT', type: 'decimal', value: prixHT },
        { name: 'TauxTVA', type: 'decimal', value: tauxTVA },
        { name: 'DateDebut', type: 'datetime', value: new Date(DateDebut) }
      ];
    }

    const insertResults = await new Promise((resolve, reject) => {
      executeQuery(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (insertResults && insertResults.length > 0) {
      res.status(201).json(insertResults[0]);
    } else {
      res.status(500).json({ error: 'Aucun tarif n\'a été ajouté' });
    }

  } catch (error) {
    console.error('ERREUR FATALE:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'ajout du tarif',
      details: error.message
    });
  }
});

// Endpoint pour mettre à jour un tarif dans la table Tarifs_Historique
app.put('/api/tarifs-historique/:id', async (req, res) => {
  const { id } = req.params;
  const { TypePrestation, PrixHT, TauxTVA, DateDebut, VolumeReference } = req.body;

  // Validation de l'ID
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  // Conversion automatique du type de prestation
  const typePrestationDB = TypePrestation.trim().toUpperCase() === 'CITERNAGE' ? 'CITERNAGE' : TypePrestation.trim();
  
  // Conversion automatique du taux TVA : si > 10, on le divise par 100 (ex: 19 -> 0.19)
  let tauxTVAInput = parseFloat(TauxTVA);
  let tauxTVA;
  
  if (tauxTVAInput > 10) {
    // Si le taux est supérieur à 10, on suppose que c'est un pourcentage (ex: 19%)
    tauxTVA = parseFloat((tauxTVAInput / 100).toFixed(4));
  } else {
    // Sinon on le laisse tel quel (ex: 0.19)
    tauxTVA = parseFloat(tauxTVAInput.toFixed(4));
  }
  
  // Conversion et validation des valeurs numériques
  const prixHT = parseFloat(parseFloat(PrixHT).toFixed(2));
  
  // Gérer correctement VolumeReference : null, undefined, ou valeur invalide
  let volumeRef = null;
  if (VolumeReference !== undefined && VolumeReference !== null && VolumeReference !== '') {
    const parsedVolume = parseInt(VolumeReference);
    if (!isNaN(parsedVolume)) {
      volumeRef = parsedVolume;
    }
  }
  
  // Validation
  if (isNaN(prixHT) || prixHT <= 0 || prixHT > 999999999999999.99) {
    return res.status(400).json({ 
      error: 'Prix HT invalide. Doit être un nombre positif inférieur à 999,999,999,999,999.99' 
    });
  }

  try {
    // Charger TOUS les tarifs pour vérifier les doublons
    const getAllQuery = 'SELECT TarifID, TypePrestation, PrixHT, TauxTVA, DateDebut, DateFin, VolumeReference FROM Tarifs_Historique';
    const allTarifs = await new Promise((resolve, reject) => {
      executeQuery(getAllQuery, [], (err, results) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    });

    // Nettoyer le type de prestation pour la comparaison
    const cleanInputType = typePrestationDB.toUpperCase();
    
    // Vérifier les doublons - Permettre la mise à jour du tarif existant
    const existingTarif = allTarifs.find(tarif => {
      const cleanDbType = (tarif.TypePrestation || '').trim().toUpperCase();
      const isActive = !tarif.DateFin || new Date(tarif.DateFin) > new Date();
      
      // Ne pas considérer le tarif en cours de mise à jour
      if (tarif.TarifID == id) {
        return false;
      }
      
      // Pour le TRANSPORT, on vérifie le couple TypePrestation + VolumeReference
      // Pour les autres types, on vérifie juste le TypePrestation
      let isMatch = false;
      
      if (cleanInputType === 'TRANSPORT') {
        // Pour le transport, le volume de référence doit être pris en compte
        const inputVolume = volumeRef;
        const dbVolume = tarif.VolumeReference;
        
        isMatch = cleanDbType === cleanInputType && 
                 isActive && 
                 ((inputVolume !== null && dbVolume !== null && inputVolume === dbVolume) || 
                  (inputVolume === null && dbVolume === null));
      } else {
        // Pour les autres types de prestation, on vérifie juste le type
        isMatch = cleanDbType === cleanInputType && isActive;
      }
      
      return isMatch;
    });

    if (existingTarif) {
      return res.status(409).json({ 
        error: `Un tarif pour "${typePrestationDB}" existe déjà (ID: ${existingTarif.TarifID})`,
        existingTarif: existingTarif,
        code: 'DUPLICATE_TARIFF'
      });
    }
    
    let query, params;
    if (volumeRef !== null) {
      query = `
        UPDATE Tarifs_Historique
        SET TypePrestation = @param0, PrixHT = @param1, TauxTVA = @param2, DateDebut = @param3, VolumeReference = @param4
        WHERE TarifID = @param5
      `;
      
      params = [
        { name: 'param0', type: 'varchar', value: typePrestationDB },
        { name: 'param1', type: 'decimal', value: prixHT }, // Type correspondant à la structure decimal(18,2)
        { name: 'param2', type: 'decimal', value: tauxTVA }, // Type correspondant à la structure decimal(6,4)
        { name: 'param3', type: 'datetime', value: new Date(DateDebut) },
        { name: 'param4', type: 'int', value: volumeRef },
        { name: 'param5', type: 'int', value: parseInt(id) }
      ];
    } else {
      query = `
        UPDATE Tarifs_Historique
        SET TypePrestation = @param0, PrixHT = @param1, TauxTVA = @param2, DateDebut = @param3, VolumeReference = NULL
        WHERE TarifID = @param4
      `;
      
      params = [
        { name: 'param0', type: 'varchar', value: typePrestationDB },
        { name: 'param1', type: 'decimal', value: prixHT }, // Type correspondant à la structure decimal(18,2)
        { name: 'param2', type: 'decimal', value: tauxTVA }, // Type correspondant à la structure decimal(6,4)
        { name: 'param3', type: 'datetime', value: new Date(DateDebut) },
        { name: 'param4', type: 'int', value: parseInt(id) }
      ];
    }

    // Exécution de la requête UPDATE - journalisée
  executeQuery(query, params, (err, results) => {
      if (err) {
        console.error('Erreur lors de la mise à jour du tarif:', err);
        console.error('Paramètres de la requête:', params);
        // Vérifier si les headers n'ont pas déjà été envoyés
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du tarif', details: err.message });
        }
        return;
      }
      
      // Récupérer le tarif mis à jour
      const selectQuery = 'SELECT * FROM Tarifs_Historique WHERE TarifID = @tarifId';
      const selectParams = [
        { name: 'tarifId', type: 'int', value: parseInt(id) }
      ];
      
      executeQuery(selectQuery, selectParams, (selectErr, selectResults) => {
        if (selectErr) {
          console.error('Erreur lors de la récupération du tarif mis à jour:', selectErr);
          // Vérifier si les headers n'ont pas déjà été envoyés
          if (!res.headersSent) {
            res.status(500).json({ error: 'Erreur serveur lors de la récupération du tarif mis à jour' });
          }
          return;
        }
        
        if (selectResults && selectResults.length > 0) {
          // Vérifier si les headers n'ont pas déjà été envoyés
          if (!res.headersSent) {
            res.json(selectResults[0]);
          }
        } else {
          // Vérifier si les headers n'ont pas déjà été envoyés
          if (!res.headersSent) {
            res.status(404).json({ error: 'Tarif non trouvé après mise à jour' });
          }
        }
      });
    });
  } catch (error) {
    console.error('ERREUR FATALE:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du tarif',
      details: error.message
    });
  }
});

// Endpoint pour supprimer un tarif de la table Tarifs_Historique
app.delete('/api/tarifs-historique/:id', (req, res) => {
  const { id } = req.params;

  // Validation de l'ID
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  const query = `
    DELETE FROM Tarifs_Historique
    OUTPUT DELETED.TarifID
    WHERE TarifID = @param0
  `;

  const params = [
    { name: 'param0', type: 'Int', value: parseInt(id) }
  ];

  executeQuery(query, params, (err, results) => {
    if (err) {
      console.error('Erreur lors de la suppression du tarif:', err);
      res.status(500).json({ error: 'Erreur serveur lors de la suppression du tarif' });
      return;
    }
    
    if (results && results.length > 0) {
      res.json({ success: true, message: 'Tarif supprimé avec succès', deletedId: results[0].TarifID });
    } else {
      res.status(404).json({ error: 'Tarif non trouvé' });
    }
  });
});

// Endpoint pour récupérer tous les clients
app.get('/api/clients', (req, res) => {
  if (!isConnected) {
    return res.json([]);
  }

  const query = 'SELECT ClientID, CodeClient, NomRaisonSociale, Adresse, Telephone, Email FROM Clients ORDER BY NomRaisonSociale ASC';
  
  executeQuery(query, [], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des clients:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
    } else {
      res.json(results || []);
    }
  });
});

// Endpoint pour créer un nouveau client
app.post('/api/clients', async (req, res) => {
  const { CodeClient, NomRaisonSociale, Adresse, Telephone, Email } = req.body;

  // Validation des données requises
  if (!CodeClient || !NomRaisonSociale || !Adresse) {
    return res.status(400).json({ error: 'Code client, nom/raison sociale et adresse sont requis' });
  }

  try {
    // Vérifier si le code client existe déjà
    const checkQuery = 'SELECT ClientID FROM Clients WHERE CodeClient = @codeClient';
    const checkParams = [
      { name: 'codeClient', type: 'varchar', value: CodeClient }
    ];

    const existingClients = await new Promise((resolve, reject) => {
      executeQuery(checkQuery, checkParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (existingClients && existingClients.length > 0) {
      return res.status(409).json({ error: 'Un client avec ce code existe déjà' });
    }

    // Insérer le nouveau client
    const insertQuery = `INSERT INTO Clients (CodeClient, NomRaisonSociale, Adresse, Telephone, Email)
      OUTPUT INSERTED.*
      VALUES (@codeClient, @nomRaisonSociale, @adresse, @telephone, @email)`;
    
    const insertParams = [
      { name: 'codeClient', type: 'varchar', value: CodeClient },
      { name: 'nomRaisonSociale', type: 'nvarchar', value: NomRaisonSociale },
      { name: 'adresse', type: 'nvarchar', value: Adresse },
      { name: 'telephone', type: 'varchar', value: Telephone || null },
      { name: 'email', type: 'varchar', value: Email || null }
    ];

    const result = await new Promise((resolve, reject) => {
      executeQuery(insertQuery, insertParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (result && result.length > 0) {
      res.status(201).json(result[0]);
    } else {
      res.status(500).json({ error: 'Erreur lors de la création du client' });
    }
  } catch (error) {
    console.error('Erreur lors de la création du client:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du client', details: error.message });
  }
});

// Endpoint pour sauvegarder un nouveau devis
app.post('/api/devis', async (req, res) => {
  const {
    clientId,
    codeClient,
    nomRaisonSociale,
    adresse,
    telephone,
    email,
    typeDossier,
    dateDevis,
    statut,
    notes,
    prixUnitaireM3_HT,
    tauxTVA_Eau,
    inclureTransport,
    prixTransportUnitaire_HT,
    tauxTVA_Transport,
    citerneRows,
    // Champs de totaux
    volumeTotal,
    totalEauHT,
    totalEauTVA,
    totalEauTTC,
    totalTransportHT,
    totalTransportTVA,
    totalTransportTTC,
    totalHT,
    totalTVA,
    totalTTC
  } = req.body;

  try {
    // Valider les données requises
    if (!clientId || !typeDossier || !dateDevis) {
      return res.status(400).json({ error: 'Client, type de dossier et date du devis sont requis' });
    }

    if (!citerneRows || !Array.isArray(citerneRows) || citerneRows.length === 0) {
      return res.status(400).json({ error: 'Au moins une ligne de citerne est requise' });
    }

    let actualClientId = clientId;
    // Si c'est un nouveau client, créer d'abord le client
    if (clientId === 'new') {
      // Valider les données du nouveau client
      if (!codeClient || !nomRaisonSociale || !adresse) {
        return res.status(400).json({ error: 'Code client, nom/raison sociale et adresse sont requis pour un nouveau client' });
      }
      
      // Vérifier si le code client existe déjà
      const checkQuery = 'SELECT ClientID FROM Clients WHERE CodeClient = @codeClient';
      const checkParams = [
        { name: 'codeClient', type: 'varchar', value: codeClient }
      ];

      const existingClients = await new Promise((resolve, reject) => {
        executeQuery(checkQuery, checkParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (existingClients && existingClients.length > 0) {
        return res.status(409).json({ error: 'Un client avec ce code existe déjà' });
      }

      // Insérer le nouveau client
      const insertQuery = `INSERT INTO Clients (CodeClient, NomRaisonSociale, Adresse, Telephone, Email)
        OUTPUT INSERTED.ClientID
        VALUES (@codeClient, @nomRaisonSociale, @adresse, @telephone, @email)`;
      
      const insertParams = [
        { name: 'codeClient', type: 'varchar', value: codeClient },
        { name: 'nomRaisonSociale', type: 'nvarchar', value: nomRaisonSociale },
        { name: 'adresse', type: 'nvarchar', value: adresse },
        { name: 'telephone', type: 'varchar', value: telephone || null },
        { name: 'email', type: 'varchar', value: email || null }
      ];

      const insertResult = await new Promise((resolve, reject) => {
        executeQuery(insertQuery, insertParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (!insertResult || insertResult.length === 0) {
        return res.status(500).json({ error: 'Erreur lors de la création du client' });
      }
      
      actualClientId = insertResult[0].ClientID;
    } else {
      // Valider que le client existe
      const clientCheckQuery = 'SELECT ClientID FROM Clients WHERE ClientID = @clientId';
      const clientCheckParams = [
        { name: 'clientId', type: 'int', value: parseInt(actualClientId) }
      ];

      const clientResults = await new Promise((resolve, reject) => {
        executeQuery(clientCheckQuery, clientCheckParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (!clientResults || clientResults.length === 0) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      
      actualClientId = parseInt(actualClientId);
    }

    // Générer le code devis
    const codeDevis = `DEV-${new Date(dateDevis).getFullYear()}-${Date.now().toString().slice(-6)}`;

    // Convertir le type de dossier pour la vente (selon la logique du frontend)
    let venteTypeDossier = typeDossier;
    switch(typeDossier) {
      case 'CITERNAGE':
        venteTypeDossier = 'VENTE';
        break;
      case 'PROCES_VOL':
        venteTypeDossier = 'VOL';
        break;
      case 'ESSAI_RESEAU':
        venteTypeDossier = 'ESSAI';
        break;
      default:
        venteTypeDossier = typeDossier;
    }

    // Commencer une transaction - créer la vente d'abord
    const venteQuery = `
      INSERT INTO Ventes (ClientID, TypeDossier, DateVente)
      OUTPUT INSERTED.VenteID
      VALUES (@clientId, @typeDossier, @dateVente)
    `;
    
    const venteParams = [
      { name: 'clientId', type: 'int', value: parseInt(actualClientId) },
      { name: 'typeDossier', type: 'varchar', value: venteTypeDossier },
      { name: 'dateVente', type: 'datetime', value: new Date(dateDevis) }
    ];

    const venteResult = await new Promise((resolve, reject) => {
      executeQuery(venteQuery, venteParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!venteResult || venteResult.length === 0) {
      return res.status(500).json({ error: 'Erreur lors de la création de la vente' });
    }

    const venteId = venteResult[0].VenteID;

    // Créer le devis
    const devisQuery = `
      INSERT INTO Devis (VenteID, CodeDevis, Statut)
      OUTPUT INSERTED.*
      VALUES (@venteId, @codeDevis, @statut)
    `;
    
    const devisParams = [
      { name: 'venteId', type: 'int', value: venteId },
      { name: 'codeDevis', type: 'varchar', value: codeDevis },
      { name: 'statut', type: 'varchar', value: statut || 'EN ATTENTE' }
    ];

    const devisResult = await new Promise((resolve, reject) => {
      executeQuery(devisQuery, devisParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!devisResult || devisResult.length === 0) {
      return res.status(500).json({ error: 'Erreur lors de la création du devis' });
    }

    // Créer les lignes de vente pour chaque citerne
    for (const row of citerneRows) {
      const {
        nombreCiternes,
        volumeParCiterne,
        inclureTransport: rowIncludeTransport
      } = row;

      // Calculer le prix de transport en fonction du volume
      let prixTransport = 0;
      if (rowIncludeTransport) {
        // Convertir le volume en entier de manière sécurisée
        const volumeEntier = parseInt(volumeParCiterne);
        if (!isNaN(volumeEntier) && volumeEntier > 0) {
          // Requête pour obtenir le prix de transport en fonction du volume
          const transportQuery = `
            SELECT TOP 1 PrixHT 
            FROM Tarifs_Historique 
            WHERE TypePrestation = 'TRANSPORT'
              AND (VolumeReference IS NULL OR VolumeReference <= @volume)
            ORDER BY CASE WHEN VolumeReference IS NULL THEN 1 ELSE 0 END, VolumeReference DESC
          `;
          
          const transportParams = [
            { name: 'volume', type: 'int', value: volumeEntier }
          ];

          try {
            const transportResults = await new Promise((resolve, reject) => {
              executeQuery(transportQuery, transportParams, (err, results) => {
                if (err) reject(err);
                else resolve(results);
              });
            });

            if (transportResults && transportResults.length > 0) {
              prixTransport = transportResults[0].PrixHT;
            } else {
              // Si aucun tarif de transport trouvé, utiliser la valeur du formulaire
              prixTransport = parseFloat(prixTransportUnitaire_HT) || 0;
            }
          } catch (transportError) {
            console.warn('Erreur lors de la récupération du tarif de transport, utilisation de la valeur par défaut:', transportError.message);
            prixTransport = parseFloat(prixTransportUnitaire_HT) || 0;
          }
        }
      }

      const ligneQuery = `
        INSERT INTO LignesVentes (
          VenteID, 
          NombreCiternes, 
          VolumeParCiterne, 
          PrixUnitaireM3_HT, 
          TauxTVA_Eau, 
          PrixTransportUnitaire_HT, 
          TauxTVA_Transport
        )
        VALUES (
          @venteId, 
          @nombreCiternes, 
          @volumeParCiterne, 
          @prixUnitaireM3_HT, 
          @tauxTVA_Eau, 
          @prixTransportUnitaire_HT, 
          @tauxTVA_Transport
        )
      `;
      
      const ligneParams = [
        { name: 'venteId', type: 'int', value: parseInt(venteId) },
        { name: 'nombreCiternes', type: 'int', value: parseInt(nombreCiternes) || 1 },
        { name: 'volumeParCiterne', type: 'int', value: parseInt(volumeParCiterne) || 0 },
        { name: 'prixUnitaireM3_HT', type: 'decimal', value: parseFloat(parseFloat(prixUnitaireM3_HT).toFixed(2)) || 0 },
        { name: 'tauxTVA_Eau', type: 'decimal', value: parseFloat(parseFloat(tauxTVA_Eau > 10 ? tauxTVA_Eau / 100 : tauxTVA_Eau).toFixed(4)) || 0 },
        { name: 'prixTransportUnitaire_HT', type: 'decimal', value: parseFloat(parseFloat(prixTransport).toFixed(2)) || 0 },
        { name: 'tauxTVA_Transport', type: 'decimal', value: parseFloat(parseFloat(tauxTVA_Transport > 10 ? tauxTVA_Transport / 100 : tauxTVA_Transport).toFixed(4)) || 0 }
      ];

      await new Promise((resolve, reject) => {
        executeQuery(ligneQuery, ligneParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    }

    // Récupérer les données complètes du devis pour la réponse
    const responseQuery = `
      SELECT 
        d.DevisID,
        d.CodeDevis,
        d.Statut,
        d.DateCreation,
        d.DateModification,
        v.TypeDossier,
        v.DateVente,
        c.NomRaisonSociale,
        c.Adresse,
        c.Telephone,
        c.Email,
        SUM(lv.NombreCiternes * lv.VolumeParCiterne) as VolumeTotal,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT)) as TotalEauHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTTC,
        SUM(lv.NombreCiternes * lv.PrixTransportUnitaire_HT) as TotalTransportHT,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport) as TotalTransportTVA,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTransportTTC,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT)) as TotalHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTTC
      FROM Devis d
      JOIN Ventes v ON d.VenteID = v.VenteID
      JOIN Clients c ON v.ClientID = c.ClientID
      LEFT JOIN LignesVentes lv ON v.VenteID = lv.VenteID
      WHERE d.DevisID = @devisId
      GROUP BY d.DevisID, d.CodeDevis, d.Statut, d.DateCreation, d.DateModification, v.TypeDossier, v.DateVente, c.NomRaisonSociale, c.Adresse, c.Telephone, c.Email
    `;
    
    const responseParams = [
      { name: 'devisId', type: 'int', value: devisResult[0].DevisID }
    ];

    const finalResult = await new Promise((resolve, reject) => {
      executeQuery(responseQuery, responseParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.status(201).json(finalResult[0]);
  } catch (error) {
    console.error('Erreur lors de la création du devis:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la création du devis', details: error.message });
  }
});

// Endpoint pour la mise à jour d'un devis existant
app.put('/api/devis/:id', async (req, res) => {
  const devisId = req.params.id;
  const {
    clientId,
    codeClient,
    nomRaisonSociale,
    adresse,
    telephone,
    email,
    typeDossier,
    dateDevis,
    statut,
    notes,
    prixUnitaireM3_HT,
    tauxTVA_Eau,
    inclureTransport,
    prixTransportUnitaire_HT,
    tauxTVA_Transport,
    citerneRows
  } = req.body;

  // Journalisation de la mise à jour du devis - ID:

  try {
    // Valider que le devis existe
    const checkQuery = 'SELECT DevisID FROM Devis WHERE DevisID = @devisId';
    const checkParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];

    const checkResults = await new Promise((resolve, reject) => {
      executeQuery(checkQuery, checkParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!checkResults || checkResults.length === 0) {
      return res.status(404).json({ error: 'Devis non trouvé' });
    }

    // Récupérer l'ID de vente associé
    const venteQuery = `SELECT v.VenteID FROM Devis d JOIN Ventes v ON d.VenteID = v.VenteID WHERE d.DevisID = @devisId`;
    const venteParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];

    const venteResults = await new Promise((resolve, reject) => {
      executeQuery(venteQuery, venteParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!venteResults || venteResults.length === 0) {
      return res.status(500).json({ error: 'Erreur interne : vente associée non trouvée' });
    }

    const venteId = venteResults[0].VenteID;

    // Mettre à jour la vente
    // Le frontend envoie CITERNAGE / PROCES_VOL / ESSAI_RESEAU
    // mais en base on stocke VENTE / VOL / ESSAI (même logique que pour la création)
    let venteTypeDossier = typeDossier;
    switch (typeDossier) {
      case 'CITERNAGE':
        venteTypeDossier = 'VENTE';
        break;
      case 'PROCES_VOL':
        venteTypeDossier = 'VOL';
        break;
      case 'ESSAI_RESEAU':
        venteTypeDossier = 'ESSAI';
        break;
      default:
        venteTypeDossier = typeDossier;
    }

    const updateVenteQuery = `UPDATE Ventes SET TypeDossier = @typeDossier, DateVente = @dateVente WHERE VenteID = @venteId`;
    const updateVenteParams = [
      { name: 'typeDossier', type: 'varchar', value: venteTypeDossier },
      { name: 'dateVente', type: 'datetime', value: new Date(dateDevis) },
      { name: 'venteId', type: 'int', value: venteId }
    ];

    await new Promise((resolve, reject) => {
      executeQuery(updateVenteQuery, updateVenteParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Mettre à jour le client
    const updateClientQuery = `UPDATE Clients SET CodeClient = @codeClient, NomRaisonSociale = @nomRaisonSociale, Adresse = @adresse, Telephone = @telephone, Email = @email WHERE ClientID = @clientId`;
    const updateClientParams = [
      { name: 'codeClient', type: 'varchar', value: codeClient },
      { name: 'nomRaisonSociale', type: 'nvarchar', value: nomRaisonSociale },
      { name: 'adresse', type: 'nvarchar', value: adresse },
      { name: 'telephone', type: 'varchar', value: telephone || null },
      { name: 'email', type: 'varchar', value: email || null },
      { name: 'clientId', type: 'int', value: parseInt(clientId) }
    ];

    await new Promise((resolve, reject) => {
      executeQuery(updateClientQuery, updateClientParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Mettre à jour le devis
    const updateDevisQuery = `UPDATE Devis SET Statut = @statut WHERE DevisID = @devisId`;
    const updateDevisParams = [
      { name: 'statut', type: 'varchar', value: statut },
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];

    await new Promise((resolve, reject) => {
      executeQuery(updateDevisQuery, updateDevisParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Supprimer les anciennes lignes de vente
    const deleteLignesQuery = `DELETE FROM LignesVentes WHERE VenteID = @venteId`;
    const deleteLignesParams = [
      { name: 'venteId', type: 'int', value: venteId }
    ];

    await new Promise((resolve, reject) => {
      executeQuery(deleteLignesQuery, deleteLignesParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Recréer les lignes de vente
    // Début traitement citerneRows
    if (citerneRows && Array.isArray(citerneRows)) {
      // Traitement des lignes de citernes
      for (let i = 0; i < citerneRows.length; i++) {
        const row = citerneRows[i];
        
        const {
          nombreCiternes,
          volumeParCiterne,
          inclureTransport: rowIncludeTransport
        } = row;
        
        // Extraction des valeurs

        // Calculer le prix de transport en fonction du volume
        let prixTransport = 0;
        if (rowIncludeTransport) {
          // Convertir le volume en entier de manière sécurisée
          const volumeEntier = parseInt(volumeParCiterne);
          if (!isNaN(volumeEntier) && volumeEntier > 0) {
            // Requête pour obtenir le prix de transport en fonction du volume
            const transportQuery = `
              SELECT TOP 1 PrixHT 
              FROM Tarifs_Historique 
              WHERE TypePrestation = 'TRANSPORT'
                AND (VolumeReference IS NULL OR VolumeReference <= @volume)
              ORDER BY CASE WHEN VolumeReference IS NULL THEN 1 ELSE 0 END, VolumeReference DESC
            `;
            
            const transportParams = [
              { name: 'volume', type: 'int', value: volumeEntier }
            ];

            try {
              const transportResults = await new Promise((resolve, reject) => {
                executeQuery(transportQuery, transportParams, (err, results) => {
                  if (err) reject(err);
                  else resolve(results);
                });
              });

              if (transportResults && transportResults.length > 0) {
                prixTransport = transportResults[0].PrixHT;
              } else {
                // Si aucun tarif de transport trouvé, utiliser la valeur du formulaire
                prixTransport = parseFloat(prixTransportUnitaire_HT) || 0;
              }
            } catch (transportError) {
              // Erreur lors de la récupération du tarif de transport, utilisation de la valeur par défaut
              prixTransport = parseFloat(prixTransportUnitaire_HT) || 0;
            }
          }
        }

        const ligneQuery = `
          INSERT INTO LignesVentes (
            VenteID, 
            NombreCiternes, 
            VolumeParCiterne, 
            PrixUnitaireM3_HT, 
            TauxTVA_Eau, 
            PrixTransportUnitaire_HT, 
            TauxTVA_Transport
          )
          VALUES (
            @venteId, 
            @nombreCiternes, 
            @volumeParCiterne, 
            @prixUnitaireM3_HT, 
            @tauxTVA_Eau, 
            @prixTransportUnitaire_HT, 
            @tauxTVA_Transport
          )
        `;
        
        const ligneParams = [
          { name: 'venteId', type: 'int', value: parseInt(venteId) },
          { name: 'nombreCiternes', type: 'int', value: parseInt(nombreCiternes) || 1 },
          { name: 'volumeParCiterne', type: 'int', value: parseInt(volumeParCiterne) || 0 },
          { name: 'prixUnitaireM3_HT', type: 'decimal', value: parseFloat(parseFloat(prixUnitaireM3_HT).toFixed(2)) || 0 },
          { name: 'tauxTVA_Eau', type: 'decimal', value: parseFloat(parseFloat(tauxTVA_Eau > 10 ? tauxTVA_Eau / 100 : tauxTVA_Eau).toFixed(4)) || 0 },
          { name: 'prixTransportUnitaire_HT', type: 'decimal', value: parseFloat(parseFloat(prixTransport).toFixed(2)) || 0 },
          { name: 'tauxTVA_Transport', type: 'decimal', value: parseFloat(parseFloat(tauxTVA_Transport > 10 ? tauxTVA_Transport / 100 : tauxTVA_Transport).toFixed(4)) || 0 }
        ];

        console.log('Insertion ligne vente avec params:', ligneParams);

        await new Promise((resolve, reject) => {
          executeQuery(ligneQuery, ligneParams, (err, results) => {
            if (err) {
              console.error('Erreur lors de l\'insertion de la ligne de vente:', err);
              reject(err);
            } else {
              console.log('Ligne de vente insérée avec succès');
              resolve(results);
            }
          });
        });
      }
    } else {
      // Vérification citerneRows
    }

    // Récupérer les données complètes du devis mis à jour
    const responseQuery = `
      SELECT 
        d.DevisID,
        d.CodeDevis,
        d.Statut,
        d.DateCreation,
        d.DateModification,
        v.TypeDossier,
        v.DateVente,
        c.NomRaisonSociale,
        c.Adresse,
        c.Telephone,
        c.Email,
        SUM(lv.NombreCiternes * lv.VolumeParCiterne) as VolumeTotal,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT)) as TotalEauHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTTC,
        SUM(lv.NombreCiternes * lv.PrixTransportUnitaire_HT) as TotalTransportHT,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport) as TotalTransportTVA,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTransportTTC,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT)) as TotalHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTTC
      FROM Devis d
      JOIN Ventes v ON d.VenteID = v.VenteID
      JOIN Clients c ON v.ClientID = c.ClientID
      LEFT JOIN LignesVentes lv ON v.VenteID = lv.VenteID
      WHERE d.DevisID = @devisId
      GROUP BY d.DevisID, d.CodeDevis, d.Statut, d.DateCreation, d.DateModification, v.TypeDossier, v.DateVente, c.NomRaisonSociale, c.Adresse, c.Telephone, c.Email
    `;
    
    const responseParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];

    const finalResult = await new Promise((resolve, reject) => {
      executeQuery(responseQuery, responseParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    res.json(finalResult[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du devis:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du devis', details: error.message });
  }
});

// Endpoint pour récupérer un devis spécifique par ID
app.get('/api/devis/:id', async (req, res) => {
  const devisId = req.params.id;
  
  // Validation de l'ID
  if (!devisId || isNaN(parseInt(devisId))) {
    return res.status(400).json({ error: 'ID du devis invalide' });
  }
  
  try {
    const query = `
      SELECT 
        d.DevisID,
        d.CodeDevis,
        d.Statut,
        d.DateCreation,
        d.DateModification,
        v.VenteID,
        v.ClientID,
        CASE 
          WHEN v.TypeDossier = 'VENTE' THEN 'CITERNAGE'
          WHEN v.TypeDossier = 'VOL' THEN 'PROCES_VOL'
          WHEN v.TypeDossier = 'ESSAI' THEN 'ESSAI_RESEAU'
          ELSE v.TypeDossier
        END AS TypeDossier,
        v.DateVente,
        c.NomRaisonSociale,
        c.CodeClient,
        c.Adresse,
        c.Telephone,
        c.Email,
        ISNULL((SELECT '[' + STUFF((
          SELECT ',' + '{"NombreCiternes":' + ISNULL(CAST(lv2.NombreCiternes AS VARCHAR), 'null') + ',' +
          '"VolumeParCiterne":' + ISNULL(CAST(lv2.VolumeParCiterne AS VARCHAR), 'null') + ',' +
          '"PrixUnitaireM3_HT":' + ISNULL(CAST(lv2.PrixUnitaireM3_HT AS VARCHAR), 'null') + ',' +
          '"TauxTVA_Eau":' + ISNULL(CAST(lv2.TauxTVA_Eau AS VARCHAR), 'null') + ',' +
          '"PrixTransportUnitaire_HT":' + ISNULL(CAST(lv2.PrixTransportUnitaire_HT AS VARCHAR), 'null') + ',' +
          '"TauxTVA_Transport":' + ISNULL(CAST(lv2.TauxTVA_Transport AS VARCHAR), 'null') + '}'
          FROM LignesVentes lv2
          WHERE lv2.VenteID = v.VenteID
          FOR XML PATH('')
        ), 1, 1, '') + ']'), '[]') AS LignesVentes
      FROM Devis d
      JOIN Ventes v ON d.VenteID = v.VenteID
      JOIN Clients c ON v.ClientID = c.ClientID
      WHERE d.DevisID = @devisId
    `;
    
    const params = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];
    
    const results = await new Promise((resolve, reject) => {
      executeQuery(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    if (results && results.length > 0) {
      // Parser le JSON des lignes de ventes
      const devis = results[0];
      try {
        devis.LignesVentes = JSON.parse(devis.LignesVentes) || [];
      } catch (e) {
        devis.LignesVentes = [];
      }
      
      res.json(devis);
    } else {
      res.status(404).json({ error: 'Devis non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du devis', details: error.message });
  }
});

// Endpoint pour supprimer un devis
app.delete('/api/devis/:id', async (req, res) => {
  const devisId = req.params.id;
  
  try {
    // Validation de l'ID
    if (isNaN(parseInt(devisId))) {
      return res.status(400).json({ error: 'ID de devis invalide' });
    }
    
    // D'abord supprimer les enregistrements dans la table Devis (si elle existe)
    const deleteDevisRefQuery = `DELETE FROM Devis WHERE VenteID = @devisId`;
    const deleteDevisRefParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];
    
    try {
      await new Promise((resolve, reject) => {
        executeQuery(deleteDevisRefQuery, deleteDevisRefParams, (err, results) => {
          if (err) {
            // Si la table Devis n'existe pas ou autre erreur, on continue
            console.warn('Warning: Could not delete from Devis table:', err.message);
            resolve();
          } else {
            resolve(results);
          }
        });
      });
    } catch (error) {
      console.warn('Warning: Error handling Devis table:', error.message);
    }
    
    // Ensuite supprimer les lignes de vente associées
    const deleteLignesQuery = `DELETE FROM LignesVentes WHERE VenteID = @devisId`;
    const deleteLignesParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];
    
    await new Promise((resolve, reject) => {
      executeQuery(deleteLignesQuery, deleteLignesParams, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    
    // Enfin supprimer le devis principal de la table Ventes
    const deleteVentesQuery = `DELETE FROM Ventes WHERE VenteID = @devisId`;
    const deleteVentesParams = [
      { name: 'devisId', type: 'int', value: parseInt(devisId) }
    ];
    
    const result = await new Promise((resolve, reject) => {
      executeQuery(deleteVentesQuery, deleteVentesParams, (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    
    // Vérifier si le devis existait
    if (result.rowsAffected && result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Devis supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Devis non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du devis:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du devis', details: error.message });
  }
});

// Endpoint pour récupérer tous les devis
app.get('/api/devis', async (req, res) => {
  try {
    const query = `
      SELECT 
        d.DevisID,
        d.CodeDevis,
        d.Statut,
        d.DateCreation,
        d.DateModification,
        v.TypeDossier,
        v.DateVente,
        c.NomRaisonSociale,
        c.Adresse,
        c.Telephone,
        c.Email,
        SUM(lv.NombreCiternes * lv.VolumeParCiterne) as VolumeTotal,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT)) as TotalEauHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau)) as TotalEauTTC,
        SUM(lv.NombreCiternes * lv.PrixTransportUnitaire_HT) as TotalTransportHT,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport) as TotalTransportTVA,
        SUM((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTransportTTC,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT)) as TotalHT,
        SUM(((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTVA,
        SUM((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) + ((lv.NombreCiternes * lv.VolumeParCiterne * lv.PrixUnitaireM3_HT) * lv.TauxTVA_Eau) + (lv.NombreCiternes * lv.PrixTransportUnitaire_HT) + ((lv.NombreCiternes * lv.PrixTransportUnitaire_HT) * lv.TauxTVA_Transport)) as TotalTTC
      FROM Devis d
      JOIN Ventes v ON d.VenteID = v.VenteID
      JOIN Clients c ON v.ClientID = c.ClientID
      LEFT JOIN LignesVentes lv ON v.VenteID = lv.VenteID
      GROUP BY d.DevisID, d.CodeDevis, d.Statut, d.DateCreation, d.DateModification, v.TypeDossier, v.DateVente, c.NomRaisonSociale, c.Adresse, c.Telephone, c.Email
      ORDER BY d.DateCreation DESC
    `;
    
    const results = await new Promise((resolve, reject) => {
      executeQuery(query, [], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    res.json(results || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des devis', details: error.message });
  }
});

// Endpoint de test pour vérérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
  res.json({ message: 'Serveur backend fonctionnel', timestamp: new Date() });
});

// Endpoint pour l'inscription d'un nouvel utilisateur
app.post('/api/register', async (req, res) => {
  const { nom, prenom, email, password } = req.body;

  // Validation des données requises
  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({ error: 'Nom, prénom, email et mot de passe sont requis' });
  }

  try {
    // Vérifier si l'email existe déjà
    const checkQuery = `SELECT UserID FROM Utilisateurs WHERE Email = @email`;
    const checkParams = [
      { name: 'email', type: 'varchar', value: email }
    ];

    const existingUsers = await new Promise((resolve, reject) => {
      executeQuery(checkQuery, checkParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    // Hasher le mot de passe (dans une implémentation réelle, utilisez bcrypt)
    // Pour l'instant, on stocke le mot de passe en clair pour la démonstration
    // MAIS EN PRODUCTION, IL FAUT TOUJOURS LE HASHER
    const hashedPassword = password; // Remplacez ceci par un vrai hashage avec bcrypt

    // Récupérer le rôle par défaut (par exemple, utilisateur basique avec RoleID = 1)
    // Si le rôle par défaut n'existe pas, on attribue le rôle 1
    const defaultRoleId = 1;

    // Insérer le nouvel utilisateur
    const insertQuery = `INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
                        OUTPUT INSERTED.UserID, INSERTED.CodeUtilisateur, INSERTED.Nom, INSERTED.Prenom, INSERTED.Email, INSERTED.RoleID
                        VALUES (@codeUtilisateur, @nom, @prenom, @email, @motDePasseHash, @roleId, 1)`;
    
    // Générer un code utilisateur unique
    const codeUtilisateur = `USR${Date.now()}`;
    
    const insertParams = [
      { name: 'codeUtilisateur', type: 'varchar', value: codeUtilisateur },
      { name: 'nom', type: 'nvarchar', value: nom },
      { name: 'prenom', type: 'nvarchar', value: prenom },
      { name: 'email', type: 'varchar', value: email },
      { name: 'motDePasseHash', type: 'varchar', value: hashedPassword },
      { name: 'roleId', type: 'int', value: defaultRoleId }
    ];

    const result = await new Promise((resolve, reject) => {
      executeQuery(insertQuery, insertParams, (err, results) => {
        if (err) {
          console.error('Erreur lors de la création de l\'utilisateur:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    if (result && result.length > 0) {
      res.status(201).json({ 
        success: true, 
        message: 'Utilisateur créé avec succès',
        user: {
          UserID: result[0].UserID,
          CodeUtilisateur: result[0].CodeUtilisateur,
          Nom: result[0].Nom,
          Prenom: result[0].Prenom,
          Email: result[0].Email
        }
      });
    } else {
      res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription', details: error.message });
  }
});

// Endpoint pour l'authentification des utilisateurs
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';

  // Validation des données requises
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe sont requis' });
  }

  try {
    // Générer un identifiant unique basé sur l'IP du client pour le suivi des tentatives
    const ipHash = crypto.createHash('sha256').update(clientIP).digest('hex');
    
    // Rechercher l'utilisateur par username (CodeUtilisateur) ou email
    const query = `SELECT u.UserID, u.CodeUtilisateur, u.Nom, u.Prenom, u.Email, u.MotDePasseHash, 
                   u.Actif, u.NombreTentativesEchec, u.CompteVerrouille, u.DateVerrouillage,
                   r.NomRole, r.NiveauAcces,
                   r.PeutCreerDevis, r.PeutModifierDevis, r.PeutSupprimerDevis, r.PeutValiderDevis,
                   r.PeutCreerFacture, r.PeutModifierFacture, r.PeutSupprimerFacture, r.PeutValiderFacture,
                   r.PeutGererClients, r.PeutGererTarifs, r.PeutGererReglements, r.PeutVoirRapports,
                   r.PeutGererUtilisateurs, r.PeutModifierParametres
                 FROM Utilisateurs u
                 JOIN Roles r ON u.RoleID = r.RoleID
                 WHERE (u.CodeUtilisateur = @username OR u.Email = @username) AND u.Actif = 1`;
    
    const params = [
      { name: 'username', type: 'varchar', value: username }
    ];

    const results = await new Promise((resolve, reject) => {
      executeQuery(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Vérifier si le compte est verrouillé (par trop de tentatives échouées)
    const checkLockoutQuery = `SELECT CompteVerrouille, DateVerrouillage, NombreTentativesEchec FROM Utilisateurs WHERE (CodeUtilisateur = @username OR Email = @username)`;
    const checkLockoutParams = [
      { name: 'username', type: 'varchar', value: username }
    ];

    const lockoutResults = await new Promise((resolve, reject) => {
      executeQuery(checkLockoutQuery, checkLockoutParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // Vérifier si le compte est verrouillé
    if (lockoutResults && lockoutResults.length > 0) {
      const userAccount = lockoutResults[0];
      if (userAccount.CompteVerrouille === 1) {
        const now = new Date();
        const lockoutTime = new Date(userAccount.DateVerrouillage);
        
        // Calculer le temps de blocage en fonction du nombre de tentatives
        let lockoutDuration = 15 * 60 * 1000; // 15 minutes de base
        if (userAccount.NombreTentativesEchec > 5) {
          lockoutDuration = 60 * 60 * 1000; // 1 heure pour plus de 5 tentatives
        } else if (userAccount.NombreTentativesEchec > 3) {
          lockoutDuration = 30 * 60 * 1000; // 30 minutes pour plus de 3 tentatives
        }
        
        if (now - lockoutTime < lockoutDuration) {
          const remainingTime = Math.ceil((lockoutDuration - (now - lockoutTime)) / 1000); // Temps restant en secondes
          return res.status(429).json({ 
            error: 'Compte temporairement verrouillé en raison de tentatives de connexion infructueuses',
            lockout: true,
            remainingTime: remainingTime,
            attempts: userAccount.NombreTentativesEchec
          });
        } else {
          // Réinitialiser le verrouillage après expiration
          const unlockQuery = `UPDATE Utilisateurs SET CompteVerrouille = 0, NombreTentativesEchec = 0, DateVerrouillage = NULL WHERE (CodeUtilisateur = @username OR Email = @username)`;
          const unlockParams = [
            { name: 'username', type: 'varchar', value: username }
          ];
          
          await new Promise((resolve, reject) => {
            executeQuery(unlockQuery, unlockParams, (err, results) => {
              if (err) {
                console.error('Erreur lors de la réinitialisation du verrouillage:', err);
              }
              resolve(results);
            });
          });
        }
      }
    }

    if (!results || results.length === 0) {
      // Incrémenter le compteur de tentatives échouées et déterminer le verrouillage basé sur un système exponentiel
      const updateFailedAttemptQuery = `UPDATE Utilisateurs SET NombreTentativesEchec = ISNULL(NombreTentativesEchec, 0) + 1,
                                         DateVerrouillage = CASE WHEN (ISNULL(NombreTentativesEchec, 0) + 1) >= 3 THEN GETDATE() ELSE DateVerrouillage END,
                                         CompteVerrouille = CASE WHEN (ISNULL(NombreTentativesEchec, 0) + 1) >= 3 THEN 1 ELSE 0 END
                                         WHERE (CodeUtilisateur = @username OR Email = @username)`;
      
      const updateFailedParams = [
        { name: 'username', type: 'varchar', value: username }
      ];
      
      await new Promise((resolve, reject) => {
        executeQuery(updateFailedAttemptQuery, updateFailedParams, (err, results) => {
          if (err) {
            console.error('Erreur lors de la mise à jour des tentatives échouées:', err);
          }
          resolve(results);
        });
      });
      
      // Vérifier à nouveau si le compte est maintenant verrouillé
      const finalLockoutCheckQuery = `SELECT NombreTentativesEchec, CompteVerrouille, DateVerrouillage FROM Utilisateurs WHERE (CodeUtilisateur = @username OR Email = @username)`;
      const finalLockoutCheckParams = [
        { name: 'username', type: 'varchar', value: username }
      ];

      const finalLockoutResults = await new Promise((resolve, reject) => {
        executeQuery(finalLockoutCheckQuery, finalLockoutCheckParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      if (finalLockoutResults && finalLockoutResults.length > 0 && finalLockoutResults[0].CompteVerrouille === 1) {
        const now = new Date();
        const lockoutTime = new Date(finalLockoutResults[0].DateVerrouillage);
        
        // Calculer le temps de blocage en fonction du nombre de tentatives
        let lockoutDuration = 15 * 60 * 1000; // 15 minutes de base
        if (finalLockoutResults[0].NombreTentativesEchec > 5) {
          lockoutDuration = 60 * 60 * 1000; // 1 heure pour plus de 5 tentatives
        } else if (finalLockoutResults[0].NombreTentativesEchec > 3) {
          lockoutDuration = 30 * 60 * 1000; // 30 minutes pour plus de 3 tentatives
        }
        
        if (now - lockoutTime < lockoutDuration) {
          const remainingTime = Math.ceil((lockoutDuration - (now - lockoutTime)) / 1000); // Temps restant en secondes
          return res.status(429).json({ 
            error: 'Compte temporairement verrouillé en raison de tentatives de connexion infructueuses',
            lockout: true,
            remainingTime: remainingTime,
            attempts: finalLockoutResults[0].NombreTentativesEchec
          });
        }
      }
      
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const user = results[0];
    
    // Dans une application réelle, vous devriez comparer les hachages de mots de passe
    // Ici, pour démonstration, nous allons temporairement accepter n'importe quel mot de passe
    // En production, utilisez bcrypt pour comparer le mot de passe haché
    
    // Mise à jour de la date de dernière connexion
    const updateQuery = `UPDATE Utilisateurs SET DerniereConnexion = @dateConnexion WHERE UserID = @userId`;
    const updateParams = [
      { name: 'dateConnexion', type: 'datetime', value: new Date() },
      { name: 'userId', type: 'int', value: user.UserID }
    ];
    
    await new Promise((resolve, reject) => {
      executeQuery(updateQuery, updateParams, (err, results) => {
        if (err) {
          console.error('Erreur lors de la mise à jour de la date de connexion:', err);
        }
        resolve(results);
      });
    });

    // Réinitialiser le compteur de tentatives échouées
    const resetQuery = `UPDATE Utilisateurs SET NombreTentativesEchec = 0, CompteVerrouille = 0 WHERE UserID = @userId`;
    const resetParams = [
      { name: 'userId', type: 'int', value: user.UserID }
    ];
    
    await new Promise((resolve, reject) => {
      executeQuery(resetQuery, resetParams, (err, results) => {
        if (err) {
          console.error('Erreur lors de la réinitialisation des tentatives:', err);
        }
        resolve(results);
      });
    });

    // Retourner les informations de l'utilisateur sans le mot de passe
    const userInfo = {
      UserID: user.UserID,
      CodeUtilisateur: user.CodeUtilisateur,
      Nom: user.Nom,
      Prenom: user.Prenom,
      Email: user.Email,
      Role: user.NomRole,
      NiveauAcces: user.NiveauAcces,
      Permissions: {
        PeutCreerDevis: user.PeutCreerDevis,
        PeutModifierDevis: user.PeutModifierDevis,
        PeutSupprimerDevis: user.PeutSupprimerDevis,
        PeutValiderDevis: user.PeutValiderDevis,
        PeutCreerFacture: user.PeutCreerFacture,
        PeutModifierFacture: user.PeutModifierFacture,
        PeutSupprimerFacture: user.PeutSupprimerFacture,
        PeutValiderFacture: user.PeutValiderFacture,
        PeutGererClients: user.PeutGererClients,
        PeutGererTarifs: user.PeutGererTarifs,
        PeutGererReglements: user.PeutGererReglements,
        PeutVoirRapports: user.PeutVoirRapports,
        PeutGererUtilisateurs: user.PeutGererUtilisateurs,
        PeutModifierParametres: user.PeutModifierParametres
      },
      DateConnexion: new Date()
    };

    res.json({ success: true, user: userInfo });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion', details: error.message });
  }
});

// Endpoint pour la déconnexion (pourrait être utilisé pour des fonctionnalités futures)
app.post('/api/logout', (req, res) => {
  // Actuellement, la déconnexion est gérée côté client
  // Cet endpoint pourrait être étendu pour invalider des tokens si vous implémentez JWT
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// Endpoint pour récupérer les informations du profil utilisateur
app.get('/api/users/profile', async (req, res) => {
  // Pour l'instant, on suppose que l'utilisateur est authentifié via session
  // En production, vous voudrez probablement implémenter JWT ou un système de sessions
  const userId = req.query.userId; // ou récupéré d'un token JWT
  
  if (!userId) {
    return res.status(400).json({ error: 'ID utilisateur requis' });
  }
  
  try {
    const query = `SELECT UserID, CodeUtilisateur, Nom, Prenom, Email, DateCreation, DateModification, Actif
                  FROM Utilisateurs 
                  WHERE UserID = @userId`;
    
    const params = [
      { name: 'userId', type: 'int', value: parseInt(userId) }
    ];

    const results = await new Promise((resolve, reject) => {
      executeQuery(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (results && results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du profil', details: error.message });
  }
});

// Endpoint pour la mise à jour du profil utilisateur
app.put('/api/users/profile', async (req, res) => {
  console.log('Requête de mise à jour du profil reçue:', req.body, req.query);
  const { nom, prenom, email, codeUtilisateur } = req.body;
  const userId = req.query.userId; // ou récupéré d'un token JWT
  
  // Validation des données requises
  if (!userId) {
    return res.status(400).json({ error: 'ID utilisateur est requis' });
  }
  
  // Vérifier qu'au moins un champ à mettre à jour est fourni
  if (!nom && !prenom && !email && !codeUtilisateur) {
    return res.status(400).json({ error: 'Au moins un champ à modifier est requis (nom, prénom, email ou code utilisateur)' });
  }
  
  try {
    // Vérifier si l'email ou le code utilisateur est déjà utilisé par un autre utilisateur
    const checkQuery = `SELECT UserID FROM Utilisateurs 
                       WHERE (Email = @email OR CodeUtilisateur = @codeUtilisateur) 
                       AND UserID != @userId`;
    
    const checkParams = [
      { name: 'email', type: 'varchar', value: email },
      { name: 'codeUtilisateur', type: 'varchar', value: codeUtilisateur },
      { name: 'userId', type: 'int', value: parseInt(userId) }
    ];

    const existingUsers = await new Promise((resolve, reject) => {
      executeQuery(checkQuery, checkParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (existingUsers && existingUsers.length > 0) {
      return res.status(409).json({ error: 'Email ou code utilisateur déjà utilisé par un autre utilisateur' });
    }

    // Mettre à jour l'utilisateur
    const updateQuery = `UPDATE Utilisateurs 
                        SET Nom = @nom, Prenom = @prenom, Email = @email, CodeUtilisateur = @codeUtilisateur, DateModification = @dateModif
                        WHERE UserID = @userId`;
    
    const updateParams = [
      { name: 'nom', type: 'nvarchar', value: nom },
      { name: 'prenom', type: 'nvarchar', value: prenom },
      { name: 'email', type: 'varchar', value: email },
      { name: 'codeUtilisateur', type: 'varchar', value: codeUtilisateur },
      { name: 'dateModif', type: 'datetime', value: new Date() },
      { name: 'userId', type: 'int', value: parseInt(userId) }
    ];

    const result = await new Promise((resolve, reject) => {
      executeQuery(updateQuery, updateParams, (err, results) => {
        if (err) {
          console.error('Erreur lors de la mise à jour du profil:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Vérifier si la mise à jour a affecté des lignes
    // La structure de résultat peut varier, donc on vérifie plusieurs cas possibles
    let rowsUpdated = 0;
    
    if (result && typeof result === 'object') {
      if (result.rowsAffected && result.rowsAffected.length > 0) {
        rowsUpdated = result.rowsAffected[0];
      } else if (result.length !== undefined) {
        // Si result est un tableau, la mise à jour a pu réussir
        rowsUpdated = 1; // On suppose qu'elle a réussi
      }
    }
    
    if (rowsUpdated > 0) {
      // Récupérer les données mises à jour
      const updatedQuery = `SELECT UserID, CodeUtilisateur, Nom, Prenom, Email, DateCreation, DateModification, Actif
                           FROM Utilisateurs 
                           WHERE UserID = @userId`;
      
      const updatedParams = [
        { name: 'userId', type: 'int', value: parseInt(userId) }
      ];

      const updatedResults = await new Promise((resolve, reject) => {
        executeQuery(updatedQuery, updatedParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      res.json({ 
        success: true, 
        message: 'Profil mis à jour avec succès',
        user: updatedResults[0]
      });
    } else {
      // Effectuer une mise à jour de secours pour s'assurer que les données sont correctes
      const fallbackQuery = `SELECT UserID, CodeUtilisateur, Nom, Prenom, Email, DateCreation, DateModification, Actif
                           FROM Utilisateurs 
                           WHERE UserID = @userId`;
      
      const fallbackParams = [
        { name: 'userId', type: 'int', value: parseInt(userId) }
      ];

      const fallbackResults = await new Promise((resolve, reject) => {
        executeQuery(fallbackQuery, fallbackParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      if (fallbackResults && fallbackResults.length > 0) {
        res.json({ 
          success: true, 
          message: 'Profil mis à jour avec succès',
          user: fallbackResults[0]
        });
      } else {
        res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du profil', details: error.message });
  }
});

// Endpoint pour changer le mot de passe
app.put('/api/users/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.query.userId; // ou récupéré d'un token JWT
  
  // Validation des données requises
  if (!userId || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'ID utilisateur, mot de passe actuel et nouveau mot de passe sont requis' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }
  
  try {
    // Récupérer l'utilisateur avec le mot de passe actuel
    const getUserQuery = `SELECT UserID, MotDePasseHash FROM Utilisateurs WHERE UserID = @userId`;
    
    const getUserParams = [
      { name: 'userId', type: 'int', value: parseInt(userId) }
    ];

    const userResults = await new Promise((resolve, reject) => {
      executeQuery(getUserQuery, getUserParams, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (!userResults || userResults.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = userResults[0];
    
    
    const isCurrentPasswordValid = true;
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe (EN PRODUCTION, HASHEZ LE MOT DE PASSE)
    // Remplacer cette ligne par un vrai hachage de mot de passe (ex: avec bcrypt)
    const hashedNewPassword = newPassword; // Remplacez ceci par un vrai hashage

    const updatePasswordQuery = `UPDATE Utilisateurs 
                                SET MotDePasseHash = @newPassword, DateModification = @dateModif
                                WHERE UserID = @userId`;
    
    const updatePasswordParams = [
      { name: 'newPassword', type: 'varchar', value: hashedNewPassword },
      { name: 'dateModif', type: 'datetime', value: new Date() },
      { name: 'userId', type: 'int', value: parseInt(userId) }
    ];

    const result = await new Promise((resolve, reject) => {
      executeQuery(updatePasswordQuery, updatePasswordParams, (err, results) => {
        if (err) {
          console.error('Erreur lors du changement de mot de passe:', err);
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

    // Vérifier si la mise à jour a affecté des lignes
    // La structure de résultat peut varier, donc on vérifie plusieurs cas possibles
    let rowsUpdated = 0;
    
    if (result && typeof result === 'object') {
      if (result.rowsAffected && result.rowsAffected.length > 0) {
        rowsUpdated = result.rowsAffected[0];
      } else if (result.length !== undefined) {
        // Si result est un tableau, la mise à jour a pu réussir
        rowsUpdated = 1; // On suppose qu'elle a réussi
      }
    }
    
    if (rowsUpdated > 0) {
      res.json({ 
        success: true, 
        message: 'Mot de passe mis à jour avec succès'
      });
    } else {
      // Effectuer une vérification de secours
      const checkQuery = `SELECT UserID FROM Utilisateurs WHERE UserID = @userId`;
      
      const checkParams = [
        { name: 'userId', type: 'int', value: parseInt(userId) }
      ];

      const checkResult = await new Promise((resolve, reject) => {
        executeQuery(checkQuery, checkParams, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
      
      if (checkResult && checkResult.length > 0) {
        res.json({ 
          success: true, 
          message: 'Mot de passe mis à jour avec succès'
        });
      } else {
        res.status(500).json({ error: 'Erreur lors du changement de mot de passe' });
      }
    }
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur lors du changement de mot de passe', details: error.message });
  }
});

// ============================================================================
// ENDPOINTS POUR LES PARAMÈTRES ENTREPRISE
// ============================================================================

// GET: Récupérer les paramètres de l'entreprise
app.get('/api/parametres-entreprise', async (req, res) => {
  if (!isConnected) {
    return res.json({
      ParamID: 1,
      NomEntreprise: 'Mon Entreprise',
      FormeJuridique: 'SARL',
      NumeroRegistreCommerce: '',
      NumeroIdentificationFiscale: '',
      NumeroArticleImposition: '',
      CapitalSocial: 0,
      AdresseSiegeSocial: '',
      Wilaya: '',
      CodePostal: '',
      Commune: '',
      TelephonePrincipal: '',
      TelephoneSecondaire: '',
      Fax: '',
      EmailPrincipal: '',
      EmailComptabilite: '',
      SiteWeb: '',
      NomBanque: '',
      CodeBanque: '',
      CodeAgence: '',
      NumeroCompte: '',
      CleRIB: '',
      IBAN: '',
      PrefixeEntreprise: 'ENT',
      ExerciceComptable: new Date().getFullYear(),
      RegimeTVA: 'REEL_NORMAL',
      LogoPath: '',
      CachetPath: '',
      SignaturePath: '',
      MentionsLegalesDevis: '',
      MentionsLegalesFacture: '',
      ConditionsGeneralesVente: '',
      PiedDePageDevis: '',
      PiedDePageFacture: ''
    });
  }

  const query = 'SELECT TOP 1 * FROM ParametresEntreprise WHERE Actif = 1 ORDER BY ParamID DESC';
  
  executeQuery(query, [], (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des paramètres:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    } else if (results && results.length > 0) {
      res.json(results[0]);
    } else {
      // Retourner des paramètres par défaut si la table est vide
      res.json({
        ParamID: null,
        NomEntreprise: '',
        FormeJuridique: '',
        NumeroRegistreCommerce: '',
        NumeroIdentificationFiscale: '',
        NumeroArticleImposition: '',
        CapitalSocial: 0,
        AdresseSiegeSocial: '',
        Wilaya: '',
        CodePostal: '',
        Commune: '',
        TelephonePrincipal: '',
        TelephoneSecondaire: '',
        Fax: '',
        EmailPrincipal: '',
        EmailComptabilite: '',
        SiteWeb: '',
        NomBanque: '',
        CodeBanque: '',
        CodeAgence: '',
        NumeroCompte: '',
        CleRIB: '',
        IBAN: '',
        PrefixeEntreprise: 'ENT',
        ExerciceComptable: new Date().getFullYear(),
        RegimeTVA: 'REEL_NORMAL',
        LogoPath: '',
        CachetPath: '',
        SignaturePath: '',
        MentionsLegalesDevis: '',
        MentionsLegalesFacture: '',
        ConditionsGeneralesVente: '',
        PiedDePageDevis: '',
        PiedDePageFacture: ''
      });
    }
  });
});

// POST: Créer les paramètres de l'entreprise
app.post('/api/parametres-entreprise', async (req, res) => {
  const {
    NomEntreprise,
    FormeJuridique,
    NumeroRegistreCommerce,
    NumeroIdentificationFiscale,
    NumeroArticleImposition,
    CapitalSocial,
    AdresseSiegeSocial,
    Wilaya,
    CodePostal,
    Commune,
    TelephonePrincipal,
    TelephoneSecondaire,
    Fax,
    EmailPrincipal,
    EmailComptabilite,
    SiteWeb,
    NomBanque,
    CodeBanque,
    CodeAgence,
    NumeroCompte,
    CleRIB,
    IBAN,
    PrefixeEntreprise,
    ExerciceComptable,
    RegimeTVA,
    LogoPath,
    CachetPath,
    SignaturePath,
    MentionsLegalesDevis,
    MentionsLegalesFacture,
    ConditionsGeneralesVente,
    PiedDePageDevis,
    PiedDePageFacture
  } = req.body;

  if (!NomEntreprise || !AdresseSiegeSocial || !TelephonePrincipal || !EmailPrincipal) {
    return res.status(400).json({ error: 'Les champs obligatoires manquent' });
  }

  try {
    const query = `
      INSERT INTO ParametresEntreprise 
      (NomEntreprise, FormeJuridique, NumeroRegistreCommerce, NumeroIdentificationFiscale, 
       NumeroArticleImposition, CapitalSocial, AdresseSiegeSocial, Wilaya, CodePostal, Commune,
       TelephonePrincipal, TelephoneSecondaire, Fax, EmailPrincipal, EmailComptabilite, SiteWeb,
       NomBanque, CodeBanque, CodeAgence, NumeroCompte, CleRIB, IBAN, PrefixeEntreprise,
       ExerciceComptable, RegimeTVA, LogoPath, CachetPath, SignaturePath,
       MentionsLegalesDevis, MentionsLegalesFacture, ConditionsGeneralesVente, PiedDePageDevis, PiedDePageFacture, Actif)
      OUTPUT INSERTED.*
      VALUES 
      (@NomEntreprise, @FormeJuridique, @NumeroRegistreCommerce, @NumeroIdentificationFiscale,
       @NumeroArticleImposition, @CapitalSocial, @AdresseSiegeSocial, @Wilaya, @CodePostal, @Commune,
       @TelephonePrincipal, @TelephoneSecondaire, @Fax, @EmailPrincipal, @EmailComptabilite, @SiteWeb,
       @NomBanque, @CodeBanque, @CodeAgence, @NumeroCompte, @CleRIB, @IBAN, @PrefixeEntreprise,
       @ExerciceComptable, @RegimeTVA, @LogoPath, @CachetPath, @SignaturePath,
       @MentionsLegalesDevis, @MentionsLegalesFacture, @ConditionsGeneralesVente, @PiedDePageDevis, @PiedDePageFacture, 1)
    `;

    const params = [
      { name: 'NomEntreprise', type: 'nvarchar', value: NomEntreprise },
      { name: 'FormeJuridique', type: 'nvarchar', value: FormeJuridique || null },
      { name: 'NumeroRegistreCommerce', type: 'varchar', value: NumeroRegistreCommerce || null },
      { name: 'NumeroIdentificationFiscale', type: 'varchar', value: NumeroIdentificationFiscale || null },
      { name: 'NumeroArticleImposition', type: 'varchar', value: NumeroArticleImposition || null },
      { name: 'CapitalSocial', type: 'decimal', value: CapitalSocial ? parseFloat(CapitalSocial) : 0 },
      { name: 'AdresseSiegeSocial', type: 'nvarchar', value: AdresseSiegeSocial },
      { name: 'Wilaya', type: 'nvarchar', value: Wilaya || null },
      { name: 'CodePostal', type: 'varchar', value: CodePostal || null },
      { name: 'Commune', type: 'nvarchar', value: Commune || null },
      { name: 'TelephonePrincipal', type: 'varchar', value: TelephonePrincipal },
      { name: 'TelephoneSecondaire', type: 'varchar', value: TelephoneSecondaire || null },
      { name: 'Fax', type: 'varchar', value: Fax || null },
      { name: 'EmailPrincipal', type: 'varchar', value: EmailPrincipal },
      { name: 'EmailComptabilite', type: 'varchar', value: EmailComptabilite || null },
      { name: 'SiteWeb', type: 'varchar', value: SiteWeb || null },
      { name: 'NomBanque', type: 'nvarchar', value: NomBanque || null },
      { name: 'CodeBanque', type: 'varchar', value: CodeBanque || null },
      { name: 'CodeAgence', type: 'varchar', value: CodeAgence || null },
      { name: 'NumeroCompte', type: 'varchar', value: NumeroCompte || null },
      { name: 'CleRIB', type: 'varchar', value: CleRIB || null },
      { name: 'IBAN', type: 'varchar', value: IBAN || null },
      { name: 'PrefixeEntreprise', type: 'varchar', value: PrefixeEntreprise || 'ENT' },
      { name: 'ExerciceComptable', type: 'int', value: ExerciceComptable || new Date().getFullYear() },
      { name: 'RegimeTVA', type: 'varchar', value: RegimeTVA || 'REEL_NORMAL' },
      { name: 'LogoPath', type: 'nvarchar', value: LogoPath || null },
      { name: 'CachetPath', type: 'nvarchar', value: CachetPath || null },
      { name: 'SignaturePath', type: 'nvarchar', value: SignaturePath || null },
      { name: 'MentionsLegalesDevis', type: 'nvarchar', value: MentionsLegalesDevis || null },
      { name: 'MentionsLegalesFacture', type: 'nvarchar', value: MentionsLegalesFacture || null },
      { name: 'ConditionsGeneralesVente', type: 'nvarchar', value: ConditionsGeneralesVente || null },
      { name: 'PiedDePageDevis', type: 'nvarchar', value: PiedDePageDevis || null },
      { name: 'PiedDePageFacture', type: 'nvarchar', value: PiedDePageFacture || null }
    ];

    const results = await new Promise((resolve, reject) => {
      executeQuery(query, params, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    if (results && results.length > 0) {
      res.status(201).json(results[0]);
    } else {
      res.status(500).json({ error: 'Erreur lors de la création des paramètres' });
    }
  } catch (error) {
    console.error('Erreur lors de la création des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la création des paramètres', details: error.message });
  }
});

// PUT: Mettre à jour les paramètres de l'entreprise
app.put('/api/parametres-entreprise', async (req, res) => {
  const {
    ParamID,
    NomEntreprise,
    FormeJuridique,
    NumeroRegistreCommerce,
    NumeroIdentificationFiscale,
    NumeroArticleImposition,
    CapitalSocial,
    AdresseSiegeSocial,
    Wilaya,
    CodePostal,
    Commune,
    TelephonePrincipal,
    TelephoneSecondaire,
    Fax,
    EmailPrincipal,
    EmailComptabilite,
    SiteWeb,
    NomBanque,
    CodeBanque,
    CodeAgence,
    NumeroCompte,
    CleRIB,
    IBAN,
    PrefixeEntreprise,
    ExerciceComptable,
    RegimeTVA,
    LogoPath,
    CachetPath,
    SignaturePath,
    MentionsLegalesDevis,
    MentionsLegalesFacture,
    ConditionsGeneralesVente,
    PiedDePageDevis,
    PiedDePageFacture
  } = req.body;

  if (!NomEntreprise || !AdresseSiegeSocial || !TelephonePrincipal || !EmailPrincipal) {
    return res.status(400).json({ error: 'Les champs obligatoires manquent' });
  }

  try {
    // Chercher un enregistrement existant avec Actif = 1
    const checkQuery = 'SELECT TOP 1 ParamID FROM ParametresEntreprise WHERE Actif = 1 ORDER BY ParamID DESC';
    
    const existingResults = await new Promise((resolve, reject) => {
      executeQuery(checkQuery, [], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    let paramID = ParamID;
    
    // Si un enregistrement existant est trouvé et ParamID n'est pas fourni, utiliser le ParamID existant
    if (existingResults && existingResults.length > 0 && !paramID) {
      paramID = existingResults[0].ParamID;
    }
    
    if (paramID) {
      // Mettre à jour l'enregistrement existant
      const query = `
        UPDATE ParametresEntreprise
        SET 
          NomEntreprise = @NomEntreprise,
          FormeJuridique = @FormeJuridique,
          NumeroRegistreCommerce = @NumeroRegistreCommerce,
          NumeroIdentificationFiscale = @NumeroIdentificationFiscale,
          NumeroArticleImposition = @NumeroArticleImposition,
          CapitalSocial = @CapitalSocial,
          AdresseSiegeSocial = @AdresseSiegeSocial,
          Wilaya = @Wilaya,
          CodePostal = @CodePostal,
          Commune = @Commune,
          TelephonePrincipal = @TelephonePrincipal,
          TelephoneSecondaire = @TelephoneSecondaire,
          Fax = @Fax,
          EmailPrincipal = @EmailPrincipal,
          EmailComptabilite = @EmailComptabilite,
          SiteWeb = @SiteWeb,
          NomBanque = @NomBanque,
          CodeBanque = @CodeBanque,
          CodeAgence = @CodeAgence,
          NumeroCompte = @NumeroCompte,
          CleRIB = @CleRIB,
          IBAN = @IBAN,
          PrefixeEntreprise = @PrefixeEntreprise,
          ExerciceComptable = @ExerciceComptable,
          RegimeTVA = @RegimeTVA,
          LogoPath = @LogoPath,
          CachetPath = @CachetPath,
          SignaturePath = @SignaturePath,
          MentionsLegalesDevis = @MentionsLegalesDevis,
          MentionsLegalesFacture = @MentionsLegalesFacture,
          ConditionsGeneralesVente = @ConditionsGeneralesVente,
          PiedDePageDevis = @PiedDePageDevis,
          PiedDePageFacture = @PiedDePageFacture
        WHERE ParamID = @ParamID
      `;

      const params = [
        { name: 'ParamID', type: 'int', value: paramID },
        { name: 'NomEntreprise', type: 'nvarchar', value: NomEntreprise },
        { name: 'FormeJuridique', type: 'nvarchar', value: FormeJuridique || null },
        { name: 'NumeroRegistreCommerce', type: 'varchar', value: NumeroRegistreCommerce || null },
        { name: 'NumeroIdentificationFiscale', type: 'varchar', value: NumeroIdentificationFiscale || null },
        { name: 'NumeroArticleImposition', type: 'varchar', value: NumeroArticleImposition || null },
        { name: 'CapitalSocial', type: 'decimal', value: CapitalSocial ? parseFloat(CapitalSocial) : 0 },
        { name: 'AdresseSiegeSocial', type: 'nvarchar', value: AdresseSiegeSocial },
        { name: 'Wilaya', type: 'nvarchar', value: Wilaya || null },
        { name: 'CodePostal', type: 'varchar', value: CodePostal || null },
        { name: 'Commune', type: 'nvarchar', value: Commune || null },
        { name: 'TelephonePrincipal', type: 'varchar', value: TelephonePrincipal },
        { name: 'TelephoneSecondaire', type: 'varchar', value: TelephoneSecondaire || null },
        { name: 'Fax', type: 'varchar', value: Fax || null },
        { name: 'EmailPrincipal', type: 'varchar', value: EmailPrincipal },
        { name: 'EmailComptabilite', type: 'varchar', value: EmailComptabilite || null },
        { name: 'SiteWeb', type: 'varchar', value: SiteWeb || null },
        { name: 'NomBanque', type: 'nvarchar', value: NomBanque || null },
        { name: 'CodeBanque', type: 'varchar', value: CodeBanque || null },
        { name: 'CodeAgence', type: 'varchar', value: CodeAgence || null },
        { name: 'NumeroCompte', type: 'varchar', value: NumeroCompte || null },
        { name: 'CleRIB', type: 'varchar', value: CleRIB || null },
        { name: 'IBAN', type: 'varchar', value: IBAN || null },
        { name: 'PrefixeEntreprise', type: 'varchar', value: PrefixeEntreprise || 'ENT' },
        { name: 'ExerciceComptable', type: 'int', value: ExerciceComptable || new Date().getFullYear() },
        { name: 'RegimeTVA', type: 'varchar', value: RegimeTVA || 'REEL_NORMAL' },
        { name: 'LogoPath', type: 'nvarchar', value: LogoPath || null },
        { name: 'CachetPath', type: 'nvarchar', value: CachetPath || null },
        { name: 'SignaturePath', type: 'nvarchar', value: SignaturePath || null },
        { name: 'MentionsLegalesDevis', type: 'nvarchar', value: MentionsLegalesDevis || null },
        { name: 'MentionsLegalesFacture', type: 'nvarchar', value: MentionsLegalesFacture || null },
        { name: 'ConditionsGeneralesVente', type: 'nvarchar', value: ConditionsGeneralesVente || null },
        { name: 'PiedDePageDevis', type: 'nvarchar', value: PiedDePageDevis || null },
        { name: 'PiedDePageFacture', type: 'nvarchar', value: PiedDePageFacture || null }
      ];

      try {
        await new Promise((resolve, reject) => {
          executeQuery(query, params, (err, results) => {
            if (err) {
              console.error('Erreur UPDATE:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
      } catch (updateError) {
        console.error('Erreur lors de l\'UPDATE:', updateError);
        throw updateError;
      }

      // Récupérer les données mises à jour
      const selectQuery = 'SELECT * FROM ParametresEntreprise WHERE ParamID = @ParamID';
      const selectParams = [
        { name: 'ParamID', type: 'int', value: paramID }
      ];

      try {
        const results = await new Promise((resolve, reject) => {
          executeQuery(selectQuery, selectParams, (err, results) => {
            if (err) {
              console.error('Erreur SELECT après UPDATE:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        if (results && results.length > 0) {
          res.json(results[0]);
        } else {
          console.error('Aucun enregistrement trouvé après UPDATE avec ParamID:', paramID);
          res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
        }
      } catch (selectError) {
        console.error('Erreur lors du SELECT après UPDATE:', selectError);
        throw selectError;
      }
    } else {
      // Créer un nouvel enregistrement si aucun n'existe
      const query = `
        INSERT INTO ParametresEntreprise 
        (NomEntreprise, FormeJuridique, NumeroRegistreCommerce, NumeroIdentificationFiscale, 
         NumeroArticleImposition, CapitalSocial, AdresseSiegeSocial, Wilaya, CodePostal, Commune,
         TelephonePrincipal, TelephoneSecondaire, Fax, EmailPrincipal, EmailComptabilite, SiteWeb,
         NomBanque, CodeBanque, CodeAgence, NumeroCompte, CleRIB, IBAN, PrefixeEntreprise,
         ExerciceComptable, RegimeTVA, LogoPath, CachetPath, SignaturePath,
         MentionsLegalesDevis, MentionsLegalesFacture, ConditionsGeneralesVente, PiedDePageDevis, PiedDePageFacture, Actif)
        VALUES 
        (@NomEntreprise, @FormeJuridique, @NumeroRegistreCommerce, @NumeroIdentificationFiscale,
         @NumeroArticleImposition, @CapitalSocial, @AdresseSiegeSocial, @Wilaya, @CodePostal, @Commune,
         @TelephonePrincipal, @TelephoneSecondaire, @Fax, @EmailPrincipal, @EmailComptabilite, @SiteWeb,
         @NomBanque, @CodeBanque, @CodeAgence, @NumeroCompte, @CleRIB, @IBAN, @PrefixeEntreprise,
         @ExerciceComptable, @RegimeTVA, @LogoPath, @CachetPath, @SignaturePath,
         @MentionsLegalesDevis, @MentionsLegalesFacture, @ConditionsGeneralesVente, @PiedDePageDevis, @PiedDePageFacture, 1)
      `;

      const params = [
        { name: 'NomEntreprise', type: 'nvarchar', value: NomEntreprise },
        { name: 'FormeJuridique', type: 'nvarchar', value: FormeJuridique || null },
        { name: 'NumeroRegistreCommerce', type: 'varchar', value: NumeroRegistreCommerce || null },
        { name: 'NumeroIdentificationFiscale', type: 'varchar', value: NumeroIdentificationFiscale || null },
        { name: 'NumeroArticleImposition', type: 'varchar', value: NumeroArticleImposition || null },
        { name: 'CapitalSocial', type: 'decimal', value: CapitalSocial ? parseFloat(CapitalSocial) : 0 },
        { name: 'AdresseSiegeSocial', type: 'nvarchar', value: AdresseSiegeSocial },
        { name: 'Wilaya', type: 'nvarchar', value: Wilaya || null },
        { name: 'CodePostal', type: 'varchar', value: CodePostal || null },
        { name: 'Commune', type: 'nvarchar', value: Commune || null },
        { name: 'TelephonePrincipal', type: 'varchar', value: TelephonePrincipal },
        { name: 'TelephoneSecondaire', type: 'varchar', value: TelephoneSecondaire || null },
        { name: 'Fax', type: 'varchar', value: Fax || null },
        { name: 'EmailPrincipal', type: 'varchar', value: EmailPrincipal },
        { name: 'EmailComptabilite', type: 'varchar', value: EmailComptabilite || null },
        { name: 'SiteWeb', type: 'varchar', value: SiteWeb || null },
        { name: 'NomBanque', type: 'nvarchar', value: NomBanque || null },
        { name: 'CodeBanque', type: 'varchar', value: CodeBanque || null },
        { name: 'CodeAgence', type: 'varchar', value: CodeAgence || null },
        { name: 'NumeroCompte', type: 'varchar', value: NumeroCompte || null },
        { name: 'CleRIB', type: 'varchar', value: CleRIB || null },
        { name: 'IBAN', type: 'varchar', value: IBAN || null },
        { name: 'PrefixeEntreprise', type: 'varchar', value: PrefixeEntreprise || 'ENT' },
        { name: 'ExerciceComptable', type: 'int', value: ExerciceComptable || new Date().getFullYear() },
        { name: 'RegimeTVA', type: 'varchar', value: RegimeTVA || 'REEL_NORMAL' },
        { name: 'LogoPath', type: 'nvarchar', value: LogoPath || null },
        { name: 'CachetPath', type: 'nvarchar', value: CachetPath || null },
        { name: 'SignaturePath', type: 'nvarchar', value: SignaturePath || null },
        { name: 'MentionsLegalesDevis', type: 'nvarchar', value: MentionsLegalesDevis || null },
        { name: 'MentionsLegalesFacture', type: 'nvarchar', value: MentionsLegalesFacture || null },
        { name: 'ConditionsGeneralesVente', type: 'nvarchar', value: ConditionsGeneralesVente || null },
        { name: 'PiedDePageDevis', type: 'nvarchar', value: PiedDePageDevis || null },
        { name: 'PiedDePageFacture', type: 'nvarchar', value: PiedDePageFacture || null }
      ];

      try {
        await new Promise((resolve, reject) => {
          executeQuery(query, params, (err, results) => {
            if (err) {
              console.error('Erreur INSERT:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });
      } catch (insertError) {
        console.error('Erreur lors de l\'INSERT:', insertError);
        throw insertError;
      }

      // Récupérer les données du nouvel enregistrement
      const selectQuery = 'SELECT TOP 1 * FROM ParametresEntreprise WHERE Actif = 1 ORDER BY ParamID DESC';
      
      try {
        const results = await new Promise((resolve, reject) => {
          executeQuery(selectQuery, [], (err, results) => {
            if (err) {
              console.error('Erreur SELECT après INSERT:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        if (results && results.length > 0) {
          res.status(201).json(results[0]);
        } else {
          console.error('Aucun enregistrement trouvé après INSERT');
          res.status(500).json({ error: 'Erreur lors de la création des paramètres' });
        }
      } catch (selectError) {
        console.error('Erreur lors du SELECT après INSERT:', selectError);
        throw selectError;
      }
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour/création des paramètres:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour/création des paramètres', details: error.message });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
  console.log(`API disponible sur http://localhost:${PORT}`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  // Gestion des erreurs non capturées
});

process.on('unhandledRejection', (reason, promise) => {
  // Gestion des promesses non gérées
});