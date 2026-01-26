-- ================================================================
-- SCRIPT DE MISE À JOUR - COMPLÉMENT DES TABLES MANQUANTES
-- Pour le projet Prestation - Compatibilité maximale
-- ================================================================

USE GestionEau;
GO

PRINT '🔍 Vérification des tables existantes...';
PRINT '';

-- ================================================================
-- VÉRIFICATION ET CRÉATION DES TABLES MANQUANTES
-- ================================================================

-- Vérifier et créer la table Clients si elle n'existe pas
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
        
        CONSTRAINT CHK_CodeClient_Length CHECK (LEN(CodeClient) = 6)
    );
    PRINT '✅ Table Clients créée';
END
ELSE
BEGIN
    PRINT 'ℹ️  Table Clients existe déjà';
END
GO

-- Vérifier et créer la table Ventes si elle n'existe pas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Ventes' AND xtype='U')
BEGIN
    CREATE TABLE Ventes (
        VenteID INT PRIMARY KEY IDENTITY(1,1),
        ClientID INT NOT NULL,
        TypeDossier VARCHAR(50) NOT NULL,
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

-- Vérifier et créer la table Devis si elle n'existe pas
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

-- Vérifier et créer la table LignesVentes si elle n'existe pas
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

-- Vérifier et créer la table Tarifs_Historique si elle n'existe pas
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
-- MISE À JOUR DES CONTRAINTES EXISTANTES
-- ================================================================

PRINT '';
PRINT '🔄 Mise à jour des contraintes et index...';

-- Ajouter les contraintes manquantes si elles n'existent pas
IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_CodeClient_Length')
BEGIN
    ALTER TABLE Clients ADD CONSTRAINT CHK_CodeClient_Length CHECK (LEN(CodeClient) = 6);
    PRINT '✅ Contrainte CHK_CodeClient_Length ajoutée';
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_TypeDossier')
BEGIN
    ALTER TABLE Ventes ADD CONSTRAINT CHK_TypeDossier CHECK (TypeDossier IN ('CITERNAGE', 'PROCES_VOL', 'ESSAI_RESEAU'));
    PRINT '✅ Contrainte CHK_TypeDossier ajoutée';
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_StatutDevis')
BEGIN
    ALTER TABLE Devis ADD CONSTRAINT CHK_StatutDevis CHECK (Statut IN ('EN ATTENTE', 'VALIDE', 'ANNULE', 'FACTURE'));
    PRINT '✅ Contrainte CHK_StatutDevis ajoutée';
END

IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CHK_TypePrestation')
BEGIN
    ALTER TABLE Tarifs_Historique ADD CONSTRAINT CHK_TypePrestation CHECK (TypePrestation IN ('EAU', 'TRANSPORT', 'CITERNAGE', 'VOL', 'ESSAI'));
    PRINT '✅ Contrainte CHK_TypePrestation ajoutée';
END
GO

-- ================================================================
-- CRÉATION DES INDEX MANQUANTS
-- ================================================================

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

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TarifsHisto_TypePrestation')
BEGIN
    CREATE INDEX IX_TarifsHisto_TypePrestation ON Tarifs_Historique(TypePrestation) WHERE Actif = 1;
    PRINT '✅ Index IX_TarifsHisto_TypePrestation créé';
END
GO

-- ================================================================
-- DONNÉES INITIALES COMPLÉMENTAIRES
-- ================================================================

PRINT '';
PRINT '📊 Initialisation des données de base...';

-- Vérifier et créer les compteurs de base
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

-- Vérifier et créer le rôle administrateur
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

-- Vérifier et créer un utilisateur admin de test
IF NOT EXISTS (SELECT * FROM Utilisateurs WHERE CodeUtilisateur = 'ADMIN001')
BEGIN
    -- Mot de passe: admin123 (hashé avec bcrypt)
    INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
    VALUES ('ADMIN001', 'Administrateur', 'Système', 'admin@entreprise.com', 
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S',
            (SELECT RoleID FROM Roles WHERE NomRole = 'ADMINISTRATEUR'), 1);
    PRINT '✅ Utilisateur ADMIN001 créé (mdp: admin123)';
END
GO

-- ================================================================
-- PROCÉDURE STOCKÉE POUR LES CODES DEVIS
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
        
        SET @AnneeEnCours = YEAR(GETDATE());
        
        IF NOT EXISTS (SELECT 1 FROM Compteurs WHERE TypeDocument = ''DEVIS'' AND Annee = @AnneeEnCours)
        BEGIN
            INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero, ReinitialisationAnnuelle)
            VALUES (''DEVIS'', ''DEV'', 0, @AnneeEnCours, ''00000'', 1);
            SET @NouveauNumero = 1;
        END
        ELSE
        BEGIN
            UPDATE Compteurs 
            SET DernierNumero = DernierNumero + 1,
                DateDernierIncrement = GETDATE()
            WHERE TypeDocument = ''DEVIS'';
            
            SELECT @NouveauNumero = DernierNumero 
            FROM Compteurs 
            WHERE TypeDocument = ''DEVIS'';
        END
        
        SET @NumeroFormate = RIGHT(''00000'' + CAST(@NouveauNumero AS VARCHAR(10)), 5);
        SET @CodeDevis = ''DEV-'' + @NumeroFormate + ''-'' + CAST(@AnneeEnCours AS VARCHAR(4));
        
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
PRINT '✅ MISE À JOUR TERMINÉE';
PRINT '================================================';
PRINT '';
PRINT '📋 Tables disponibles :';
PRINT '   • Clients';
PRINT '   • Ventes';  
PRINT '   • Devis';
PRINT '   • LignesVentes';
PRINT '   • Tarifs_Historique';
PRINT '   • Compteurs';
PRINT '   • Roles';
PRINT '   • Utilisateurs';
PRINT '   • ParametresEntreprise';
PRINT '   • HistoriqueActions';
PRINT '';
PRINT '🔧 Fonctionnalités :';
PRINT '   • Index optimisés';
PRINT '   • Contraintes de validation';
PRINT '   • Procédure sp_GenererCodeDevis';
PRINT '   • Données initiales configurées';
PRINT '';
PRINT '🔐 Utilisateur de test : ADMIN001 / admin123';
PRINT '================================================';
