-- ================================================================
-- SCRIPT DE MIGRATION OPTIMISÉ POUR LE PROJET PRESTATION
-- Compatible avec la structure actuelle et les exigences de sécurité
-- ================================================================

USE master;
GO

-- Vérifier si la base de données existe déjà
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'GestionEau')
BEGIN
    CREATE DATABASE GestionEau;
    PRINT '✅ Base de données GestionEau créée avec succès.';
END
ELSE
BEGIN
    PRINT 'ℹ️  Base de données GestionEau existe déjà.';
END
GO

USE GestionEau;
GO

-- ================================================================
-- TABLES PRINCIPALES POUR LA GESTION COMMERCIALE
-- ================================================================

-- Table des clients
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Clients' AND xtype='U')
BEGIN
    CREATE TABLE Clients (
        ClientID INT PRIMARY KEY IDENTITY(1,1),
        CodeClient VARCHAR(20) UNIQUE NOT NULL,
        NomRaisonSociale NVARCHAR(200) NOT NULL,
        Adresse NVARCHAR(MAX) NOT NULL,
        Telephone VARCHAR(20) NULL,
        Email VARCHAR(100) NULL,
        DateCreation DATETIME DEFAULT GETDATE(),
        DateModification DATETIME DEFAULT GETDATE(),
        Actif BIT DEFAULT 1,
        
        CONSTRAINT CHK_CodeClient_Length CHECK (LEN(CodeClient) = 6) -- Format standard
    );
    
    PRINT '✅ Table Clients créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Clients existe déjà';
END
GO

-- Table des ventes/dossiers
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Ventes' AND xtype='U')
BEGIN
    CREATE TABLE Ventes (
        VenteID INT PRIMARY KEY IDENTITY(1,1),
        ClientID INT NOT NULL,
        TypeDossier VARCHAR(50) NOT NULL, -- CITERNAGE, PROCES_VOL, ESSAI_RESEAU
        DateVente DATETIME NOT NULL DEFAULT GETDATE(),
        DateCreation DATETIME DEFAULT GETDATE(),
        DateModification DATETIME DEFAULT GETDATE(),
        Actif BIT DEFAULT 1,
        
        CONSTRAINT FK_Ventes_Clients FOREIGN KEY (ClientID) REFERENCES Clients(ClientID),
        CONSTRAINT CHK_TypeDossier CHECK (TypeDossier IN ('CITERNAGE', 'PROCES_VOL', 'ESSAI_RESEAU'))
    );
    
    PRINT '✅ Table Ventes créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Ventes existe déjà';
END
GO

-- Table des devis
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Devis' AND xtype='U')
BEGIN
    CREATE TABLE Devis (
        DevisID INT PRIMARY KEY IDENTITY(1,1),
        VenteID INT NOT NULL,
        CodeDevis VARCHAR(50) UNIQUE NOT NULL,
        Statut VARCHAR(50) DEFAULT 'EN ATTENTE',
        DateCreation DATETIME DEFAULT GETDATE(),
        DateModification DATETIME DEFAULT GETDATE(),
        Actif BIT DEFAULT 1,
        
        CONSTRAINT FK_Devis_Ventes FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID),
        CONSTRAINT CHK_StatutDevis CHECK (Statut IN ('EN ATTENTE', 'VALIDE', 'ANNULE', 'FACTURE'))
    );
    
    PRINT '✅ Table Devis créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Devis existe déjà';
END
GO

-- Table des lignes de ventes (citernes)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LignesVentes' AND xtype='U')
BEGIN
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
        
        CONSTRAINT FK_LignesVentes_Ventes FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID),
        CONSTRAINT CHK_NombreCiternes CHECK (NombreCiternes >= 1),
        CONSTRAINT CHK_VolumeParCiterne CHECK (VolumeParCiterne >= 0 AND VolumeParCiterne <= 500)
    );
    
    PRINT '✅ Table LignesVentes créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table LignesVentes existe déjà';
END
GO

-- Table des tarifs historiques
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tarifs_Historique' AND xtype='U')
BEGIN
    CREATE TABLE Tarifs_Historique (
        TarifID INT PRIMARY KEY IDENTITY(1,1),
        TypePrestation VARCHAR(50) NOT NULL,
        VolumeReference INT NULL,
        PrixHT DECIMAL(18,2) NOT NULL,
        TauxTVA DECIMAL(6,4) NOT NULL,
        DateDebut DATETIME NOT NULL DEFAULT GETDATE(),
        DateFin DATETIME NULL,
        DateCreation DATETIME DEFAULT GETDATE(),
        DateModification DATETIME DEFAULT GETDATE(),
        Actif BIT DEFAULT 1,
        
        CONSTRAINT CHK_TypePrestation CHECK (TypePrestation IN ('EAU', 'TRANSPORT', 'CITERNAGE', 'VOL', 'ESSAI')),
        CONSTRAINT CHK_PrixHT CHECK (PrixHT > 0),
        CONSTRAINT CHK_TauxTVA CHECK (TauxTVA >= 0 AND TauxTVA <= 1)
    );
    
    PRINT '✅ Table Tarifs_Historique créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Tarifs_Historique existe déjà';
END
GO

-- ================================================================
-- TABLES DE GESTION SYSTÈME
-- ================================================================

-- Table des compteurs pour la numérotation
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Compteurs' AND xtype='U')
BEGIN
    CREATE TABLE Compteurs (
        CompteurID INT PRIMARY KEY IDENTITY(1,1),
        TypeDocument VARCHAR(20) UNIQUE NOT NULL,
        Prefixe VARCHAR(10) NOT NULL,
        DernierNumero INT DEFAULT 0,
        Annee INT NOT NULL,
        FormatNumero VARCHAR(50) DEFAULT '00000',
        ReinitialisationAnnuelle BIT DEFAULT 1,
        DateDernierIncrement DATETIME NULL,
        
        CONSTRAINT CHK_TypeDocument CHECK (TypeDocument IN ('DEVIS', 'FACTURE', 'CLIENT', 'REGLEMENT'))
    );
    
    PRINT '✅ Table Compteurs créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Compteurs existe déjà';
END
GO

-- Table des rôles utilisateurs
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Roles' AND xtype='U')
BEGIN
    CREATE TABLE Roles (
        RoleID INT PRIMARY KEY IDENTITY(1,1),
        NomRole VARCHAR(50) UNIQUE NOT NULL,
        Description NVARCHAR(200) NULL,
        NiveauAcces INT NOT NULL DEFAULT 1,
        
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
    
    PRINT '✅ Table Roles créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Roles existe déjà';
END
GO

-- Table des utilisateurs (version simplifiée et sécurisée)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Utilisateurs' AND xtype='U')
BEGIN
    CREATE TABLE Utilisateurs (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        RoleID INT NOT NULL DEFAULT 1,
        
        -- Informations personnelles
        CodeUtilisateur VARCHAR(20) UNIQUE NOT NULL,
        Nom NVARCHAR(100) NOT NULL,
        Prenom NVARCHAR(100) NOT NULL,
        Email VARCHAR(100) UNIQUE NOT NULL,
        Telephone VARCHAR(20) NULL,
        
        -- Authentification sécurisée
        MotDePasseHash VARCHAR(255) NOT NULL,
        Salt VARCHAR(100) NULL,
        DerniereConnexion DATETIME NULL,
        NombreTentativesEchec INT DEFAULT 0,
        CompteVerrouille BIT DEFAULT 0,
        DateVerrouillage DATETIME NULL,
        
        -- Métadonnées
        DateCreation DATETIME DEFAULT GETDATE(),
        DateModification DATETIME DEFAULT GETDATE(),
        Actif BIT DEFAULT 1,
        
        CONSTRAINT FK_Utilisateurs_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID),
        CONSTRAINT CHK_Email_Format CHECK (Email LIKE '%_@_%._%')
    );
    
    PRINT '✅ Table Utilisateurs créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Utilisateurs existe déjà';
END
GO

-- ================================================================
-- DONNÉES INITIALES
-- ================================================================

-- Insertion des compteurs de base
IF NOT EXISTS (SELECT * FROM Compteurs WHERE TypeDocument = 'DEVIS')
BEGIN
    INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero)
    VALUES ('DEVIS', 'DEV', 0, YEAR(GETDATE()), '00000');
    PRINT '✅ Compteur DEVIS initialisé';
END

IF NOT EXISTS (SELECT * FROM Compteurs WHERE TypeDocument = 'CLIENT')
BEGIN
    INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero)
    VALUES ('CLIENT', 'CLI', 0, YEAR(GETDATE()), '00000');
    PRINT '✅ Compteur CLIENT initialisé';
END
GO

-- Insertion du rôle administrateur
IF NOT EXISTS (SELECT * FROM Roles WHERE NomRole = 'ADMINISTRATEUR')
BEGIN
    INSERT INTO Roles (NomRole, Description, NiveauAcces, 
                      PeutCreerDevis, PeutModifierDevis, PeutSupprimerDevis, PeutValiderDevis,
                      PeutCreerFacture, PeutModifierFacture, PeutSupprimerFacture, PeutValiderFacture,
                      PeutGererClients, PeutGererTarifs, PeutGererReglements, PeutVoirRapports, 
                      PeutGererUtilisateurs, PeutModifierParametres)
    VALUES ('ADMINISTRATEUR', 'Administrateur système avec tous les droits', 4,
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
    PRINT '✅ Rôle ADMINISTRATEUR créé';
END
GO

-- Insertion d'un utilisateur admin de test (mot de passe hashé)
IF NOT EXISTS (SELECT * FROM Utilisateurs WHERE CodeUtilisateur = 'ADMIN001')
BEGIN
    -- Mot de passe: admin123 (hashé avec bcrypt - à remplacer par un vrai hash en production)
    INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
    VALUES ('ADMIN001', 'Administrateur', 'Système', 'admin@entreprise.com', 
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', -- bcrypt hash de "admin123"
            (SELECT RoleID FROM Roles WHERE NomRole = 'ADMINISTRATEUR'), 1);
    PRINT '✅ Utilisateur ADMIN001 créé (mdp: admin123)';
END
GO

-- ================================================================
-- INDEX POUR OPTIMISER LES PERFORMANCES
-- ================================================================

-- Création des index si ils n'existent pas
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Clients_CodeClient')
BEGIN
    CREATE INDEX IX_Clients_CodeClient ON Clients(CodeClient);
    PRINT '✅ Index IX_Clients_CodeClient créé';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Devis_CodeDevis')
BEGIN
    CREATE INDEX IX_Devis_CodeDevis ON Devis(CodeDevis);
    PRINT '✅ Index IX_Devis_CodeDevis créé';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Utilisateurs_Email')
BEGIN
    CREATE INDEX IX_Utilisateurs_Email ON Utilisateurs(Email) WHERE Actif = 1;
    PRINT '✅ Index IX_Utilisateurs_Email créé';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TarifsHisto_TypePrestation')
BEGIN
    CREATE INDEX IX_TarifsHisto_TypePrestation ON Tarifs_Historique(TypePrestation) WHERE Actif = 1;
    PRINT '✅ Index IX_TarifsHisto_TypePrestation créé';
END
GO

-- ================================================================
-- PROCÉDURE STOCKÉE POUR GÉNÉRER LES CODES DEVIS
-- ================================================================

IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'sp_GenererCodeDevis')
BEGIN
    EXEC('
    CREATE PROCEDURE sp_GenererCodeDevis
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @CodeDevis VARCHAR(50);
        DECLARE @AnneeEnCours INT;
        DECLARE @NouveauNumero INT;
        DECLARE @NumeroFormate VARCHAR(10);
        
        -- Obtenir l''année en cours
        SET @AnneeEnCours = YEAR(GETDATE());
        
        -- Vérifier si un compteur existe pour les devis cette année
        IF NOT EXISTS (SELECT 1 FROM Compteurs WHERE TypeDocument = ''DEVIS'' AND Annee = @AnneeEnCours)
        BEGIN
            INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero, ReinitialisationAnnuelle)
            VALUES (''DEVIS'', ''DEV'', 0, @AnneeEnCours, ''00000'', 1);
            SET @NouveauNumero = 1;
        END
        ELSE
        BEGIN
            -- Incrémenter le dernier numéro
            UPDATE Compteurs 
            SET DernierNumero = DernierNumero + 1,
                DateDernierIncrement = GETDATE()
            WHERE TypeDocument = ''DEVIS'';
            
            SELECT @NouveauNumero = DernierNumero 
            FROM Compteurs 
            WHERE TypeDocument = ''DEVIS'';
        END
        
        -- Formater le numéro avec des zéros à gauche
        SET @NumeroFormate = RIGHT(''00000'' + CAST(@NouveauNumero AS VARCHAR(10)), 5);
        
        -- Générer le code devis final
        SET @CodeDevis = ''DEV-'' + @NumeroFormate + ''-'' + CAST(@AnneeEnCours AS VARCHAR(4));
        
        -- Retourner le code devis généré
        SELECT @CodeDevis AS CodeDevis;
    END
    ');
    PRINT '✅ Procédure sp_GenererCodeDevis créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Procédure sp_GenererCodeDevis existe déjà';
END
GO

-- ================================================================
-- VÉRIFICATION FINALE
-- ================================================================

PRINT '';
PRINT '================================================';
PRINT '✅ MIGRATION TERMINÉE AVEC SUCCÈS';
PRINT '================================================';
PRINT 'Tables créées : Clients, Ventes, Devis, LignesVentes, Tarifs_Historique';
PRINT 'Tables système : Compteurs, Roles, Utilisateurs';
PRINT 'Procédures : sp_GenererCodeDevis';
PRINT 'Index optimisés pour les performances';
PRINT '';
PRINT 'Utilisateur de test : ADMIN001 / admin123';
PRINT 'Base de données prête pour l''application';
PRINT '================================================';
