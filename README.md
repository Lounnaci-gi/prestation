# Système de Gestion Eau - Application Complète

Application complète de gestion des ventes d'eau, vols et essais avec interface React et backend Node.js connecté à SQL Server.

## Structure du projet

```
d:/prestation/
├── src/                    # Frontend React
│   ├── api/               # Appels API backend
│   ├── components/        # Composants React réutilisables
│   ├── pages/             # Pages de l'application
│   └── utils/             # Utilitaires
├── server/                # Backend Node.js/Express
│   ├── server.js          # Serveur principal
│   ├── package.json       # Dépendances backend
│   └── .env              # Configuration de la base de données
└── bdd.sql               # Script de base de données
```

## Installation et configuration

### 1. Backend (serveur API)

Naviguez dans le répertoire server et installez les dépendances :

```bash
cd server
npm install
```

Configurez la connexion à votre base de données SQL Server dans le fichier `.env` :

```env
DB_SERVER=localhost
DB_NAME=GestionEau
DB_USERNAME=sa
DB_PASSWORD=votre_mot_de_passe
DB_ENCRYPT=true
PORT=5000
```

Démarrez le serveur backend :

```bash
npm start
# ou pour le développement :
npm run dev
```

Le backend sera disponible sur `http://localhost:5000`

### 2. Frontend (application React)

Installez les dépendances (si ce n'est pas déjà fait) :

```bash
npm install
```

Créez un fichier `.env` à la racine du projet pour configurer l'API backend :

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Démarrez l'application frontend :

```bash
npm start
```

L'application sera disponible sur `http://localhost:3000`

## Configuration de la base de données

Assurez-vous que votre base de données SQL Server est correctement configurée avec le script fourni :

```sql
-- Exécutez le script bdd.sql dans SQL Server Management Studio
-- ou avec sqlcmd
```

## Fonctionnalités principales

- **Gestion des tarifs** : Ajouter, modifier, supprimer des tarifs dans la table `Tarifs_Historique`
- **Gestion des clients** : Enregistrement et suivi des clients
- **Gestion des ventes** : Suivi des dossiers de vente
- **Gestion des devis** : Création et suivi des devis
- **Gestion des factures** : Génération et suivi des factures

## Architecture technique

- **Frontend** : React 19.2.3, React Router, SweetAlert2
- **Backend** : Node.js, Express, tedious (pour SQL Server)
- **Base de données** : Microsoft SQL Server
- **Communication** : API RESTful sur HTTP

## Points d'API principaux

- `GET /api/tarifs-historique` - Récupérer tous les tarifs
- `POST /api/tarifs-historique` - Ajouter un nouveau tarif
- `PUT /api/tarifs-historique/:id` - Mettre à jour un tarif
- `DELETE /api/tarifs-historique/:id` - Supprimer un tarif

## Dépannage

Si vous rencontrez des problèmes de connexion à la base de données :

1. Vérifiez que SQL Server est en cours d'exécution
2. Vérifiez les paramètres de connexion dans `.env`
3. Assurez-vous que le nom de la base de données est correct
4. Vérifiez que les tables ont été créées avec le script `bdd.sql`

## Remarques importantes

- L'application frontend ne peut pas se connecter directement à SQL Server pour des raisons de sécurité
- Le backend API sert d'intermédiaire entre le frontend et la base de données
- Toutes les opérations CRUD sont maintenant effectuées sur la base de données réelle
- Les données sont maintenant persistées dans la table `Tarifs_Historique`