-- ================================================================
-- SCRIPT DE CR�ATION COMPL�TE - PROJET GESTION EAU
-- Base de donn�es, Tables, Proc�dures stock�es et Utilisateurs
-- Date: 2026-01-27
-- ================================================================

USE master;
GO

-- ================================================================
-- CR�ATION DE LA BASE DE DONN�ES
-- ================================================================

IF EXISTS (SELECT * FROM sys.databases WHERE name = 'GestionEau')
BEGIN
    DROP DATABASE GestionEau;
    PRINT 'Base de donn�es GestionEau supprim�e';
END
GO

CREATE DATABASE GestionEau;
PRINT 'Base de donn�es GestionEau cr��e';
GO

USE GestionEau;
GO

PRINT '';
PRINT '================================================';
PRINT 'CR�ATION DES TABLES';
PRINT '================================================';
PRINT '';

-- ================================================================
-- TABLE DES R�LES
-- ================================================================

CREATE TABLE Roles (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    NomRole VARCHAR(50) UNIQUE NOT NULL,
    Description NVARCHAR(200) NULL,
    NiveauAcces INT NOT NULL DEFAULT 1,
    
    -- Permissions sur les devis
    PeutCreerDevis BIT DEFAULT 0,
    PeutModifierDevis BIT DEFAULT 0,
    PeutSupprimerDevis BIT DEFAULT 0,
    PeutValiderDevis BIT DEFAULT 0,
    
    -- Permissions sur les factures
    PeutCreerFacture BIT DEFAULT 0,
    PeutModifierFacture BIT DEFAULT 0,
    PeutSupprimerFacture BIT DEFAULT 0,
    PeutValiderFacture BIT DEFAULT 0,
    
    -- Permissions g�n�rales
    PeutGererClients BIT DEFAULT 0,
    PeutGererTarifs BIT DEFAULT 0,
    PeutGererReglements BIT DEFAULT 0,
    PeutVoirRapports BIT DEFAULT 0,
    PeutGererUtilisateurs BIT DEFAULT 0,
    PeutModifierParametres BIT DEFAULT 0,
    
    DateCreation DATETIME DEFAULT GETDATE(),
    Actif BIT DEFAULT 1
);
PRINT 'Table Roles cr��e';
GO

-- ================================================================
-- TABLE DES UTILISATEURS
-- ================================================================

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
    MotDePasseHash VARCHAR(255) NOT NULL,
    Salt VARCHAR(100) NULL,
    DerniereConnexion DATETIME NULL,
    NombreTentativesEchec INT DEFAULT 0,
    CompteVerrouille BIT DEFAULT 0,
    DateVerrouillage DATETIME NULL,
    
    -- S�curit�
    TokenReinitialisation VARCHAR(255) NULL,
    DateExpirationToken DATETIME NULL,
    DeuxFacteursActif BIT DEFAULT 0,
    SecretDeuxFacteurs VARCHAR(100) NULL,
    
    -- Pr�f�rences
    Langue VARCHAR(10) DEFAULT 'fr-DZ',
    Theme VARCHAR(20) DEFAULT 'light',
    FormatDate VARCHAR(20) DEFAULT 'dd/MM/yyyy',
    FormatNombre VARCHAR(20) DEFAULT 'fr-DZ',
    
    -- M�tadonn�es
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    CreePar INT NULL,
    ModifiePar INT NULL,
    Actif BIT DEFAULT 1,
    Commentaire NVARCHAR(500) NULL,
    
    CONSTRAINT FK_Utilisateurs_Roles FOREIGN KEY (RoleID) REFERENCES Roles(RoleID),
    CONSTRAINT CHK_Email_Format CHECK (Email LIKE '%_@_%._%')
);
PRINT 'Table Utilisateurs cr��e';
GO

-- ================================================================
-- TABLE DES CLIENTS
-- ================================================================

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
PRINT 'Table Clients cr��e';
GO

-- ================================================================
-- TABLE DES VENTES
-- ================================================================

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
PRINT 'Table Ventes cr��e';
GO

-- ================================================================
-- TABLE DES DEVIS
-- ================================================================

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
PRINT 'Table Devis cr��e';
GO

-- ================================================================
-- TABLE DES LIGNES DE VENTES
-- ================================================================

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
PRINT 'Table LignesVentes cr��e';
GO

-- ================================================================
-- TABLE DES TARIFS HISTORIQUES
-- ================================================================

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
PRINT 'Table Tarifs_Historique cr��e';
GO

-- ================================================================
-- TABLE DES COMPTEURS
-- ================================================================

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
PRINT 'Table Compteurs cr��e';
GO

-- ================================================================
-- TABLE DES PARAM�TRES ENTREPRISE
-- ================================================================

CREATE TABLE ParametresEntreprise (
    ParamID INT PRIMARY KEY IDENTITY(1,1),
    NomEntreprise NVARCHAR(200) NOT NULL,
    AdresseSiegeSocial NVARCHAR(MAX) NULL,
    TelephonePrincipal VARCHAR(20) NULL,
    TelephoneSecondaire VARCHAR(20) NULL,
    Fax VARCHAR(20) NULL,
    EmailPrincipal VARCHAR(100) NULL,
    PrefixeEntreprise VARCHAR(10) NOT NULL DEFAULT 'ENT',
    RegistreCommerce VARCHAR(50) NULL,
    NumeroIdentificationFiscale VARCHAR(50) NULL,
    NumeroArticleImposition VARCHAR(50) NULL,
    Wilaya NVARCHAR(100) NULL,
    Commune NVARCHAR(100) NULL,
    CodePostal VARCHAR(10) NULL,
    NomBanque NVARCHAR(200) NULL,
    NumeroCompte VARCHAR(50) NULL,
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    Actif BIT DEFAULT 1
);
PRINT 'Table ParametresEntreprise créée';
GO

-- ================================================================
-- TABLE D'HISTORIQUE DES ACTIONS
-- ================================================================

CREATE TABLE HistoriqueActions (
    ActionID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    TypeAction VARCHAR(50) NOT NULL,
    TableCible VARCHAR(50) NULL,
    IDCible INT NULL,
    Description NVARCHAR(500) NULL,
    DateAction DATETIME DEFAULT GETDATE(),
    AdresseIP VARCHAR(50) NULL,
    
    CONSTRAINT FK_HistoriqueActions_Utilisateurs FOREIGN KEY (UserID) REFERENCES Utilisateurs(UserID)
);
PRINT 'Table HistoriqueActions cr��e';
GO

-- ================================================================
-- CR�ATION DES INDEX
-- ================================================================

PRINT '';
PRINT 'Cr�ation des index...';

CREATE INDEX IX_Clients_CodeClient ON Clients(CodeClient);
CREATE INDEX IX_Clients_NomRaisonSociale ON Clients(NomRaisonSociale);
CREATE INDEX IX_Devis_CodeDevis ON Devis(CodeDevis);
CREATE INDEX IX_Ventes_ClientID ON Ventes(ClientID);
CREATE INDEX IX_Ventes_DateVente ON Ventes(DateVente);
CREATE INDEX IX_LignesVentes_VenteID ON LignesVentes(VenteID);
CREATE INDEX IX_TarifsHisto_TypePrestation ON Tarifs_Historique(TypePrestation) WHERE Actif = 1;
CREATE INDEX IX_Utilisateurs_Email ON Utilisateurs(Email) WHERE Actif = 1;

PRINT 'Index cr��s avec succ�s';
GO

-- ================================================================
-- INSERTION DES DONN�ES INITIALES
-- ================================================================

PRINT '';
PRINT 'Insertion des donn�es initiales...';

-- Insertion des r�les
INSERT INTO Roles (NomRole, Description, NiveauAcces, 
                  PeutCreerDevis, PeutModifierDevis, PeutSupprimerDevis, PeutValiderDevis,
                  PeutCreerFacture, PeutModifierFacture, PeutSupprimerFacture, PeutValiderFacture,
                  PeutGererClients, PeutGererTarifs, PeutGererReglements, PeutVoirRapports, 
                  PeutGererUtilisateurs, PeutModifierParametres)
VALUES 
    ('ADMINISTRATEUR', 'Administrateur syst�me avec tous les droits', 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1),
    ('MANAGER', 'Manager avec droits �tendus', 3, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0),
    ('COMMERCIAL', 'Commercial - Gestion devis et factures', 2, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0),
    ('CONSULTATION', 'Consultation uniquement', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0);

PRINT 'R�les ins�r�s';
GO

-- Insertion des compteurs
INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero)
VALUES 
    ('DEVIS', 'DEV', 0, YEAR(GETDATE()), '00000'),
    ('FACTURE', 'FAC', 0, YEAR(GETDATE()), '00000'),
    ('CLIENT', 'CLI', 0, YEAR(GETDATE()), '00000'),
    ('REGLEMENT', 'REG', 0, YEAR(GETDATE()), '00000');

PRINT 'Compteurs initialis�s';
GO

-- Insertion des param�tres entreprise
INSERT INTO ParametresEntreprise (NomEntreprise, AdresseSiegeSocial, TelephonePrincipal, 
                                   EmailPrincipal, PrefixeEntreprise, ExerciceComptable)
VALUES ('Entreprise de Gestion Eau', 'Adresse Si�ge Social', '0123456789', 
        'contact@entreprise.com', 'GV', YEAR(GETDATE()));

PRINT 'Param�tres entreprise configur�s';
GO

-- Insertion des utilisateurs
DECLARE @RoleAdminID INT, @RoleManagerID INT, @RoleCommercialID INT, @RoleConsultationID INT;

SELECT @RoleAdminID = RoleID FROM Roles WHERE NomRole = 'ADMINISTRATEUR';
SELECT @RoleManagerID = RoleID FROM Roles WHERE NomRole = 'MANAGER';
SELECT @RoleCommercialID = RoleID FROM Roles WHERE NomRole = 'COMMERCIAL';
SELECT @RoleConsultationID = RoleID FROM Roles WHERE NomRole = 'CONSULTATION';

-- Utilisateur Administrateur
INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
VALUES ('ADMIN001', 'Administrateur', 'Syst�me', 'admin@entreprise.com', 
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', @RoleAdminID, 1);

-- Utilisateur Manager
INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
VALUES ('MGR001', 'Manager', 'Principal', 'manager@entreprise.com', 
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', @RoleManagerID, 1);

-- Utilisateur Commercial
INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
VALUES ('COM001', 'Commercial', 'Un', 'commercial@entreprise.com', 
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', @RoleCommercialID, 1);

-- Utilisateur Consultation
INSERT INTO Utilisateurs (CodeUtilisateur, Nom, Prenom, Email, MotDePasseHash, RoleID, Actif)
VALUES ('CONS001', 'Consultation', 'Utilisateur', 'consultation@entreprise.com', 
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', @RoleConsultationID, 1);

PRINT 'Utilisateurs cr��s';
GO

-- ================================================================
-- PROC�DURE STOCK�E : G�N�RATION CODE DEVIS
-- ================================================================

PRINT '';
PRINT 'Cr�ation de la proc�dure stock�e...';
GO

CREATE PROCEDURE sp_GenererCodeDevis
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CodeDevis VARCHAR(50);
    DECLARE @PrefixeEntreprise VARCHAR(10);
    DECLARE @AnneeEnCours INT;
    DECLARE @NouveauNumero INT;
    DECLARE @NumeroFormate VARCHAR(10);
    
    -- Obtenir l'ann�e en cours
    SET @AnneeEnCours = YEAR(GETDATE());
    
    -- Obtenir le pr�fixe de l'entreprise
    SELECT TOP 1 @PrefixeEntreprise = PrefixeEntreprise 
    FROM ParametresEntreprise 
    WHERE Actif = 1
    ORDER BY ParamID DESC;
    
    -- Si on ne trouve pas de pr�fixe, utiliser une valeur par d�faut
    IF @PrefixeEntreprise IS NULL
        SET @PrefixeEntreprise = 'ENT';
    
    -- V�rifier si un compteur existe pour les devis cette ann�e
    IF NOT EXISTS (SELECT 1 FROM Compteurs WHERE TypeDocument = 'DEVIS' AND Annee = @AnneeEnCours)
    BEGIN
        -- Cr�er une nouvelle entr�e pour cette ann�e
        INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero, ReinitialisationAnnuelle)
        VALUES ('DEVIS', @PrefixeEntreprise, 0, @AnneeEnCours, '0000', 1);
        
        SET @NouveauNumero = 1;
    END
    ELSE
    BEGIN
        -- V�rifier si l'ann�e a chang�
        DECLARE @AncienneAnnee INT;
        SELECT @AncienneAnnee = Annee 
        FROM Compteurs 
        WHERE TypeDocument = 'DEVIS';
        
        -- Si l'ann�e a chang�, r�initialiser le compteur
        IF @AncienneAnnee < @AnneeEnCours
        BEGIN
            UPDATE Compteurs 
            SET DernierNumero = 0, 
                Annee = @AnneeEnCours,
                Prefixe = @PrefixeEntreprise
            WHERE TypeDocument = 'DEVIS';
            
            SET @NouveauNumero = 1;
        END
        ELSE
        BEGIN
            -- Incr�menter le dernier num�ro
            UPDATE Compteurs 
            SET DernierNumero = DernierNumero + 1,
                DateDernierIncrement = GETDATE()
            WHERE TypeDocument = 'DEVIS';
            
            SELECT @NouveauNumero = DernierNumero 
            FROM Compteurs 
            WHERE TypeDocument = 'DEVIS';
        END
    END
    
    -- Formater le num�ro avec des z�ros � gauche (4 chiffres)
    SET @NumeroFormate = RIGHT('0000' + CAST(@NouveauNumero AS VARCHAR(10)), 4);
    
    -- G�n�rer le code devis final au format XXXX/prefix/yyyy
    SET @CodeDevis = @NumeroFormate + '/' + @PrefixeEntreprise + '/' + CAST(@AnneeEnCours AS VARCHAR(4));
    
    -- Retourner le code devis g�n�r�
    SELECT @CodeDevis AS CodeDevis;
END;
GO

PRINT 'Proc�dure sp_GenererCodeDevis cr��e';
GO

-- ================================================================
-- R�SUM� FINAL
-- ================================================================

PRINT '';
PRINT '================================================';
PRINT 'BASE DE DONN�ES CR��E AVEC SUCC�S';
PRINT '================================================';
PRINT '';
PRINT 'Base de donn�es : GestionEau';
PRINT '';
PRINT 'Tables cr��es (10) :';
PRINT '   1. Roles';
PRINT '   2. Utilisateurs';
PRINT '   3. Clients';
PRINT '   4. Ventes';
PRINT '   5. Devis';
PRINT '   6. LignesVentes';
PRINT '   7. Tarifs_Historique';
PRINT '   8. Compteurs';
PRINT '   9. ParametresEntreprise';
PRINT '   10. HistoriqueActions';
PRINT '';
PRINT 'Proc�dures stock�es (1) :';
PRINT '   - sp_GenererCodeDevis';
PRINT '';
PRINT 'Utilisateurs cr��s (4) :';
PRINT '   - ADMIN001 / admin123 (Administrateur)';
PRINT '   - MGR001 / admin123 (Manager)';
PRINT '   - COM001 / admin123 (Commercial)';
PRINT '   - CONS001 / admin123 (Consultation)';
PRINT '';
PRINT 'R�les configur�s (4) :';
PRINT '   - ADMINISTRATEUR (Niveau 4)';
PRINT '   - MANAGER (Niveau 3)';
PRINT '   - COMMERCIAL (Niveau 2)';
PRINT '   - CONSULTATION (Niveau 1)';
PRINT '';
PRINT '================================================';
PRINT 'Pr�t pour utilisation !';
PRINT '================================================';
GO

-- Test de la proc�dure stock�e
PRINT '';
PRINT 'Test de la proc�dure sp_GenererCodeDevis :';
EXEC sp_GenererCodeDevis;
PRINT '';



# Configuration de la base de données SQL Server
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=GestionEau
DB_USERNAME=lounnaci
DB_PASSWORD=hyhwarez
DB_ENCRYPT=true
DB_TRUST_CERTIFICATE=true

# Port du serveur backend
PORT=5000

# Configuration de développement
NODE_ENV=development

# Clé secrète JWT
JWT_SECRET=7054d5974adc57fad20b71d52ee05d3d4009b2141181faba779e9b6b588fc3b293962737c437d3eca3aa7277695be6312ec8ee0bbc25fbbf751af4e74deabef4
JWT_EXPIRES_IN=24h





Invoke-RestMethod -Uri http://localhost:5000/api/register -Method Post -ContentType "application/json" -Body '{"nom":"Lounnaci","prenom":"User","email":"lounnaci@entreprise.com","password":"Lounnaci123@"}' -TimeoutSec 15