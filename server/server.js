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
  if (!isConnected) {
    callback(new Error('Connexion à la base de données non disponible'), null);
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

  connection.execSql(request);
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