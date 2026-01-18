require('dotenv').config();
const express = require('express');
const { Connection, Request, TYPES } = require('tedious');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
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

console.log(`Tentative de connexion à la base de données ${config.options.database} avec l'utilisateur ${config.authentication.options.userName}...`);

// Connexion à la base de données
const connection = new Connection(config);
let isConnected = false;

// Essayer de se connecter immédiatement
connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
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
    console.log('Connexion SQL Server établie');
    isConnected = true;
  }
});

// Gestion des erreurs de connexion
connection.on('end', () => {
  console.log('Connexion à la base de données fermée');
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
        console.warn(`Type inconnu: ${param.type}, utilisation de VarChar`);
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

    console.log('Exécution de la requête UPDATE avec params:', params);
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
        { name: 'venteId', type: 'int', value: venteId },
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

// Endpoint de test pour vérérifier que le serveur fonctionne
app.get('/api/test', (req, res) => {
  res.json({ message: 'Serveur backend fonctionnel', timestamp: new Date() });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
  console.log(`API disponible sur http://localhost:${PORT}/api`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  console.error('Erreur non capturée:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse non gérée:', reason);
});