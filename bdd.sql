USE master;
GO

-- Vérifie si la base existe déjà pour éviter une erreur
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'GestionEau')
BEGIN
    CREATE DATABASE GestionEau;
    PRINT 'La base de données GestionEau a été créée avec succès.';
END
ELSE
BEGIN
    PRINT 'La base de données GestionEau existe déjà.';
END
GO


/* =============================================================================
TABLES COMPLÉMENTAIRES : Paramètres Entreprise et Gestion Utilisateurs
=============================================================================
*/

USE GestionEau;
GO

-- ============================================================================
-- 1. TABLE DES PARAMÈTRES DE L'ENTREPRISE
-- ============================================================================
CREATE TABLE ParametresEntreprise (
    ParamID INT PRIMARY KEY IDENTITY(1,1),
    
    -- Informations légales
    NomEntreprise NVARCHAR(200) NOT NULL,
    FormeJuridique NVARCHAR(50) NULL,              -- SARL, SPA, EURL, etc.
    NumeroRegistreCommerce VARCHAR(50) NULL,       -- RC
    NumeroIdentificationFiscale VARCHAR(50) NULL,  -- NIF
    NumeroArticleImposition VARCHAR(50) NULL,      -- N° Article d'imposition
    CapitalSocial DECIMAL(18, 2) NULL,
    
    -- Adresses
    AdresseSiegeSocial NVARCHAR(MAX) NOT NULL,
    Wilaya NVARCHAR(50) NULL,
    CodePostal VARCHAR(10) NULL,
    Commune NVARCHAR(100) NULL,
    
    -- Contacts
    TelephonePrincipal VARCHAR(20) NOT NULL,
    TelephoneSecondaire VARCHAR(20) NULL,
    Fax VARCHAR(20) NULL,
    EmailPrincipal VARCHAR(100) NOT NULL,
    EmailComptabilite VARCHAR(100) NULL,
    SiteWeb VARCHAR(200) NULL,
    
    -- Informations bancaires
    NomBanque NVARCHAR(100) NULL,
    CodeBanque VARCHAR(10) NULL,
    CodeAgence VARCHAR(10) NULL,
    NumeroCompte VARCHAR(50) NULL,
    CleRIB VARCHAR(5) NULL,
    IBAN VARCHAR(34) NULL,                         -- Format international si applicable
    
    -- Préfixe unique de l'entreprise
    PrefixeEntreprise VARCHAR(10) NOT NULL DEFAULT 'ENT', -- Ex: CB, TV, TC
    
    -- Paramètres comptables
    ExerciceComptable INT NULL,                    -- Année en cours
    RegimeTVA VARCHAR(20) DEFAULT 'REEL_NORMAL',  -- REEL_NORMAL, REEL_SIMPLIFIE, etc.
    
    -- Logo et signature
    LogoPath NVARCHAR(500) NULL,                   -- Chemin vers le logo
    CachetPath NVARCHAR(500) NULL,                 -- Chemin vers le cachet
    SignaturePath NVARCHAR(500) NULL,              -- Chemin vers la signature
    
    -- Textes personnalisables pour documents
    MentionsLegalesDevis NVARCHAR(MAX) NULL,
    MentionsLegalesFacture NVARCHAR(MAX) NULL,
    ConditionsGeneralesVente NVARCHAR(MAX) NULL,
    PiedDePageDevis NVARCHAR(MAX) NULL,
    PiedDePageFacture NVARCHAR(MAX) NULL,
    
    -- Métadonnées
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    ModifiePar INT NULL,                           -- UserID qui a modifié
    Actif BIT DEFAULT 1,                           -- Pour gérer plusieurs configurations
    
    CONSTRAINT CHK_RegimeTVA CHECK (RegimeTVA IN ('REEL_NORMAL', 'REEL_SIMPLIFIE', 'FORFAIT'))
);
GO

-- ============================================================================
-- 2. TABLE DES RÔLES UTILISATEURS
-- ============================================================================
CREATE TABLE Roles (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    NomRole VARCHAR(50) UNIQUE NOT NULL,
    Description NVARCHAR(200) NULL,
    NiveauAcces INT NOT NULL DEFAULT 1,            -- 1=Basique, 2=Moyen, 3=Élevé, 4=Admin
    
    -- Permissions fonctionnelles
    PeutCreerDevis BIT DEFAULT 0,
    PeutModifierDevis BIT DEFAULT 0,
    PeutSupprimerDevis BIT DEFAULT 0,
    PeutValiderDevis BIT DEFAULT 0,
    
    PeutCreerFacture BIT DEFAULT 0,
    PeutModifierFacture BIT DEFAULT 0,
    PeutSupprimerFacture BIT DEFAULT 0,
    PeutValiderFacture BIT DEFAULT 0,
    
    PeutGererClients BIT DEFAULT 0,
    PeutGererTarifs BIT DEFAULT 0,
    PeutGererReglements BIT DEFAULT 0,
    PeutVoirRapports BIT DEFAULT 0,
    PeutGererUtilisateurs BIT DEFAULT 0,
    PeutModifierParametres BIT DEFAULT 0,
    
    DateCreation DATETIME DEFAULT GETDATE(),
    Actif BIT DEFAULT 1
);
GO

-- ============================================================================
-- 3. TABLE DES UTILISATEURS
-- ============================================================================
CREATE TABLE Utilisateurs (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    RoleID INT NOT NULL,
    
    -- Informations personnelles
    CodeUtilisateur VARCHAR(20) UNIQUE NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Telephone VARCHAR(20) NULL,
    
    -- Authentification
    MotDePasseHash VARCHAR(255) NOT NULL,          -- Hash du mot de passe (bcrypt, etc.)
    Salt VARCHAR(100) NULL,                        -- Salt pour le hashage
    DerniereConnexion DATETIME NULL,
    NombreTentativesEchec INT DEFAULT 0,
    CompteVerrouille BIT DEFAULT 0,
    DateVerrouillage DATETIME NULL,
    
    -- Sécurité
    TokenReinitialisation VARCHAR(255) NULL,       -- Pour reset password
    DateExpirationToken DATETIME NULL,
    DeuxFacteursActif BIT DEFAULT 0,
    SecretDeuxFacteurs VARCHAR(100) NULL,
    
    -- Préférences utilisateur
    Langue VARCHAR(10) DEFAULT 'fr-DZ',            -- fr-DZ, ar-DZ
    Theme VARCHAR(20) DEFAULT 'light',             -- light, dark
    FormatDate VARCHAR(20) DEFAULT 'dd/MM/yyyy',
    FormatNombre VARCHAR(20) DEFAULT 'fr-DZ',      -- Format nombre selon locale
    
    -- Métadonnées
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    CreePar INT NULL,                              -- UserID créateur
    ModifiePar INT NULL,                           -- UserID modificateur
    Actif BIT DEFAULT 1,
    Commentaire NVARCHAR(500) NULL,
    
    CONSTRAINT FK_Utilisateurs_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID),
    CONSTRAINT FK_Utilisateurs_CreePar FOREIGN KEY (CreePar) REFERENCES Utilisateurs(UserID),
    CONSTRAINT FK_Utilisateurs_ModifiePar FOREIGN KEY (ModifiePar) REFERENCES Utilisateurs(UserID)
);
GO

-- ============================================================================
-- 4. TABLE HISTORIQUE DES ACTIONS UTILISATEURS (Audit Trail)
-- ============================================================================
CREATE TABLE HistoriqueActions (
    ActionID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    TypeAction VARCHAR(50) NOT NULL,               -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    TableCible VARCHAR(100) NULL,                  -- Table concernée
    IDCible INT NULL,                              -- ID de l'enregistrement concerné
    AncienneValeur NVARCHAR(MAX) NULL,             -- JSON des anciennes valeurs
    NouvelleValeur NVARCHAR(MAX) NULL,             -- JSON des nouvelles valeurs
    AdresseIP VARCHAR(45) NULL,                    -- IPv4 ou IPv6
    UserAgent NVARCHAR(500) NULL,                  -- Navigateur/Device
    DateAction DATETIME DEFAULT GETDATE(),
    Reussi BIT DEFAULT 1,
    MessageErreur NVARCHAR(MAX) NULL,
    
    CONSTRAINT FK_HistoriqueActions_Users FOREIGN KEY (UserID) REFERENCES Utilisateurs(UserID)
);
GO

-- ============================================================================
-- 5. TABLE DES COMPTEURS DE NUMÉROTATION
-- ============================================================================
CREATE TABLE Compteurs (
    CompteurID INT PRIMARY KEY IDENTITY(1,1),
    TypeDocument VARCHAR(20) UNIQUE NOT NULL,      -- DEVIS, FACTURE, CLIENT
    Prefixe VARCHAR(10) NOT NULL,
    DernierNumero INT DEFAULT 0,
    Annee INT NOT NULL,
    FormatNumero VARCHAR(50) DEFAULT '00000',      -- Padding: 00001, 00002, etc.
    ReinitialisationAnnuelle BIT DEFAULT 1,        -- Reset à chaque nouvelle année
    DateDernierIncrement DATETIME NULL,
    
    CONSTRAINT CHK_TypeDocument CHECK (TypeDocument IN ('DEVIS', 'FACTURE', 'CLIENT', 'REGLEMENT'))
);
GO

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mise à jour automatique de DateModification (ParametresEntreprise)
CREATE TRIGGER trg_UpdateParamEntrepriseDate
ON ParametresEntreprise
AFTER UPDATE
AS
BEGIN
    UPDATE ParametresEntreprise
    SET DateModification = GETDATE()
    FROM ParametresEntreprise
    INNER JOIN inserted ON ParametresEntreprise.ParamID = inserted.ParamID;
END;
GO

-- Trigger pour mise à jour automatique de DateModification (Utilisateurs)
CREATE TRIGGER trg_UpdateUtilisateurDate
ON Utilisateurs
AFTER UPDATE
AS
BEGIN
    UPDATE Utilisateurs
    SET DateModification = GETDATE()
    FROM Utilisateurs
    INNER JOIN inserted ON Utilisateurs.UserID = inserted.UserID;
END;
GO

-- ============================================================================
-- INDEX POUR OPTIMISATION DES PERFORMANCES
-- ============================================================================

-- Index sur Email pour recherches rapides
CREATE NONCLUSTERED INDEX IX_Utilisateurs_Email 
ON Utilisateurs(Email) 
WHERE Actif = 1;

-- Index sur CodeUtilisateur
CREATE NONCLUSTERED INDEX IX_Utilisateurs_CodeUtilisateur 
ON Utilisateurs(CodeUtilisateur) 
WHERE Actif = 1;

-- Index sur les actions par utilisateur
CREATE NONCLUSTERED INDEX IX_HistoriqueActions_UserID_Date 
ON HistoriqueActions(UserID, DateAction DESC);

-- Index sur les types d'actions
CREATE NONCLUSTERED INDEX IX_HistoriqueActions_TypeAction 
ON HistoriqueActions(TypeAction, DateAction DESC);

GO

/* =============================================================================
COMMENTAIRES D'UTILISATION :

1. ParametresEntreprise : 
   - Stocker UNE SEULE ligne active (Actif=1) pour les paramètres en cours
   - Historiser les anciennes configurations si besoin

2. Roles :
   - Créer des rôles standards : ADMIN, GESTIONNAIRE, COMPTABLE, COMMERCIAL, CONSULTATION

3. Utilisateurs :
   - JAMAIS stocker le mot de passe en clair
   - Utiliser bcrypt ou Argon2 côté application React/Node.js
   - Implémenter le verrouillage après 5 tentatives échouées

4. HistoriqueActions :
   - Logger toutes les actions critiques (création/modification/suppression)
   - Conserver minimum 1 an pour audit

5. Compteurs :
   - Utiliser des transactions pour incrémenter de manière thread-safe
   - Exemple de génération : FACT-2024-00001, FACT-2024-00002, etc.

============================================================================= */