-- Script de migration pour les tables essentielles du projet Prestation
-- Ce script crée les tables nécessaires pour le bon fonctionnement de l'application

-- Création de la base de données si elle n'existe pas
USE master;
GO

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

USE GestionEau;
GO

-- Table des clients
CREATE TABLE Clients (
    ClientID INT PRIMARY KEY IDENTITY(1,1),
    CodeClient VARCHAR(20) UNIQUE NOT NULL,
    NomRaisonSociale NVARCHAR(200) NOT NULL,
    Adresse NVARCHAR(MAX) NOT NULL,
    Telephone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL,
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    Actif BIT DEFAULT 1
);
GO

-- Table des ventes
CREATE TABLE Ventes (
    VenteID INT PRIMARY KEY IDENTITY(1,1),
    ClientID INT NOT NULL,
    TypeDossier VARCHAR(50) NOT NULL, -- CITERNAGE, PROCES_VOL, ESSAI_RESEAU, etc.
    DateVente DATETIME NOT NULL,
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ClientID) REFERENCES Clients(ClientID)
);
GO

-- Table des devis
CREATE TABLE Devis (
    DevisID INT PRIMARY KEY IDENTITY(1,1),
    VenteID INT NOT NULL,
    CodeDevis VARCHAR(50) UNIQUE NOT NULL,
    Statut VARCHAR(50) DEFAULT 'EN ATTENTE',
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID)
);
GO

-- Table des lignes de ventes
CREATE TABLE LignesVentes (
    LigneVenteID INT PRIMARY KEY IDENTITY(1,1),
    VenteID INT NOT NULL,
    NombreCiternes INT NOT NULL DEFAULT 1,
    VolumeParCiterne INT NOT NULL DEFAULT 0,
    PrixUnitaireM3_HT DECIMAL(18,2) NOT NULL,
    TauxTVA_Eau DECIMAL(6,4) NOT NULL,
    PrixTransportUnitaire_HT DECIMAL(18,2) DEFAULT 0,
    TauxTVA_Transport DECIMAL(6,4) DEFAULT 0,
    DateCreation DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID)
);
GO

-- Table des tarifs historiques
CREATE TABLE Tarifs_Historique (
    TarifID INT PRIMARY KEY IDENTITY(1,1),
    TypePrestation VARCHAR(50) NOT NULL, -- EAU, TRANSPORT, CITERNAGE
    VolumeReference INT NULL, -- Pour distinguer les différents volumes de transport
    PrixHT DECIMAL(18,2) NOT NULL,
    TauxTVA DECIMAL(6,4) NOT NULL,
    DateDebut DATETIME NOT NULL DEFAULT GETDATE(),
    DateFin DATETIME NULL,
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE()
);
GO

-- Table des compteurs pour la numérotation
CREATE TABLE Compteurs (
    CompteurID INT PRIMARY KEY IDENTITY(1,1),
    TypeDocument VARCHAR(20) UNIQUE NOT NULL, -- DEVIS, FACTURE, CLIENT
    Prefixe VARCHAR(10) NOT NULL,
    DernierNumero INT DEFAULT 0,
    Annee INT NOT NULL,
    FormatNumero VARCHAR(50) DEFAULT '00000', -- Padding: 00001, 00002, etc.
    ReinitialisationAnnuelle BIT DEFAULT 1, -- Reset à chaque nouvelle année
    DateDernierIncrement DATETIME NULL,
    
    CONSTRAINT CHK_TypeDocument CHECK (TypeDocument IN ('DEVIS', 'FACTURE', 'CLIENT', 'REGLEMENT'))
);
GO

-- Création des index pour optimiser les performances
CREATE INDEX IX_Clients_CodeClient ON Clients(CodeClient);
CREATE INDEX IX_Clients_NomRaisonSociale ON Clients(NomRaisonSociale);
CREATE INDEX IX_Devis_CodeDevis ON Devis(CodeDevis);
CREATE INDEX IX_Ventes_ClientID ON Ventes(ClientID);
CREATE INDEX IX_Ventes_DateVente ON Ventes(DateVente);
CREATE INDEX IX_LignesVentes_VenteID ON LignesVentes(VenteID);
CREATE INDEX IX_TarifsHisto_TypePrestation ON Tarifs_Historique(TypePrestation);

-- Table des utilisateurs pour l'authentification
CREATE TABLE Utilisateurs (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    RoleID INT NOT NULL DEFAULT 1,
    
    -- Informations personnelles
    CodeUtilisateur VARCHAR(20) UNIQUE NOT NULL,
    Nom NVARCHAR(100) NOT NULL,
    Prenom NVARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Telephone VARCHAR(20) NULL,
    
    -- Authentification
    MotDePasseHash VARCHAR(255) NOT NULL, -- Hash du mot de passe (bcrypt, etc.)
    Salt VARCHAR(100) NULL, -- Salt pour le hashage
    DerniereConnexion DATETIME NULL,
    NombreTentativesEchec INT DEFAULT 0,
    CompteVerrouille BIT DEFAULT 0,
    DateVerrouillage DATETIME NULL,
    
    -- Sécurité
    TokenReinitialisation VARCHAR(255) NULL, -- Pour reset password
    DateExpirationToken DATETIME NULL,
    DeuxFacteursActif BIT DEFAULT 0,
    SecretDeuxFacteurs VARCHAR(100) NULL,
    
    -- Préférences utilisateur
    Langue VARCHAR(10) DEFAULT 'fr-DZ', -- fr-DZ, ar-DZ
    Theme VARCHAR(20) DEFAULT 'light', -- light, dark
    FormatDate VARCHAR(20) DEFAULT 'dd/MM/yyyy',
    FormatNombre VARCHAR(20) DEFAULT 'fr-DZ', -- Format nombre selon locale
    
    -- Métadonnées
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    CreePar INT NULL, -- UserID créateur
    ModifiePar INT NULL, -- UserID modificateur
    Actif BIT DEFAULT 1,
    Commentaire NVARCHAR(500) NULL
);
GO

-- Table des rôles
CREATE TABLE Roles (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    NomRole VARCHAR(500) UNIQUE NOT NULL,
    Description NVARCHAR(200) NULL,
    NiveauAcces INT NOT NULL DEFAULT 1, -- 1=Basique, 2=Moyen, 3=Élevé, 4=Admin
    
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

-- Insertion des données initiales si nécessaire
-- Paramètres de compteur pour la génération de numéros
INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero)
SELECT 'DEVIS', 'DEV', 0, YEAR(GETDATE()), '00000'
WHERE NOT EXISTS (SELECT * FROM Compteurs WHERE TypeDocument = 'DEVIS');

INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero)
SELECT 'CLIENT', 'CLI', 0, YEAR(GETDATE()), '00000'
WHERE NOT EXISTS (SELECT * FROM Compteurs WHERE TypeDocument = 'CLIENT');

-- Insertion d'un rôle administrateur par défaut
INSERT INTO Roles (NomRole, Description, NiveauAcces, PeutCreerDevis, PeutModifierDevis, PeutSupprimerDevis, PeutValiderDevis,
                  PeutCreerFacture, PeutModifierFacture, PeutSupprimerFacture, PeutValiderFacture,
                  PeutGererClients, PeutGererTarifs, PeutGererReglements, PeutVoirRapports, PeutGererUtilisateurs, PeutModifierParametres)
SELECT 'ADMINISTRATEUR', 'Administrateur système avec tous les droits', 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
WHERE NOT EXISTS (SELECT * FROM Roles WHERE NomRole = 'ADMINISTRATEUR');

-- Insertion d'un utilisateur administrateur par défaut (mot de passe: admin123, hashé)
-- Note: Dans une application réelle, vous devriez hasher le mot de passe correctement
INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
SELECT 'ADMIN001', 'Administrateur', 'Système', 'admin@entreprise.com', 
       'pbkdf2:sha256:260000$...', -- Cela devrait être un hash réel, exemple simplifié ici
       (SELECT RoleID FROM Roles WHERE NomRole = 'ADMINISTRATEUR'), 1
WHERE NOT EXISTS (SELECT * FROM Utilisateurs WHERE CodeUtilisateur = 'ADMIN001'); 

GO

PRINT 'Tables essentielles pour le projet Prestation créées avec succès.';