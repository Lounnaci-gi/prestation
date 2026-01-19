/* =============================================================================
NOM DU SCRIPT : GestionVentesEau_Algerie.sql
DESCRIPTION    : Système complet de gestion des ventes d'eau, vols et essais.
DEVISE         : DZD (Dinar Algérien)
=============================================================================
*/

CREATE DATABASE GestionEau;
GO

USE GestionEau;
GO

-- 1. TABLE DES CLIENTS (Abonnés ou Entreprises)
CREATE TABLE Clients (
    ClientID INT PRIMARY KEY IDENTITY(1,1),
    CodeClient VARCHAR(20) UNIQUE NOT NULL,
    NomRaisonSociale NVARCHAR(150) NOT NULL,
    Adresse NVARCHAR(MAX) NOT NULL,
    Telephone VARCHAR(20) NULL,
    Email VARCHAR(100) NULL,
    DateCreation DATETIME DEFAULT GETDATE()
);

-- 2. TABLE DES PARAMÈTRES ET TARIFS (Historisation)
CREATE TABLE Tarifs_Historique (
    TarifID INT PRIMARY KEY IDENTITY(1,1),
    TypePrestation VARCHAR(20) NOT NULL, -- 'VENTE', 'VOL', 'ESSAI', 'TRANSPORT'
    VolumeReference INT NULL,            -- Utilisé pour le transport (ex: 3, 6 m3)
    PrixHT DECIMAL(18, 2) NOT NULL,
    TauxTVA DECIMAL(5, 4) NOT NULL,
    DateDebut DATETIME NOT NULL DEFAULT GETDATE(),
    DateFin DATETIME NULL,                -- NULL = Tarif en vigueur
    Prefix NVARCHAR(2) NOT NULL
);

-- 3. TABLE DES VENTES / DOSSIERS
CREATE TABLE Ventes (
    VenteID INT PRIMARY KEY IDENTITY(1,1),
    ClientID INT NOT NULL,
    TypeDossier VARCHAR(20) NOT NULL, 
    DateVente DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Ventes_Clients FOREIGN KEY (ClientID) REFERENCES Clients(ClientID),
    CONSTRAINT CHK_TypeDossier CHECK (TypeDossier IN ('VENTE', 'PROCES_VOL', 'ESSAI_RESEAU'))
);

-- 4. TABLE DES DÉTAILS (Capture des prix et TVA au moment de la vente)
CREATE TABLE LignesVentes (
    LigneID INT PRIMARY KEY IDENTITY(1,1),
    VenteID INT NOT NULL,
    NombreCiternes INT NOT NULL DEFAULT 1,
    VolumeParCiterne INT NOT NULL CHECK (VolumeParCiterne BETWEEN 1 AND 500),
    
    -- Prix Eau (Capturés pour l'historique)
    PrixUnitaireM3_HT DECIMAL(18, 2) NOT NULL, 
    TauxTVA_Eau DECIMAL(5, 4) NOT NULL,
    
    -- Prix Transport (Capturés pour l'historique)
    PrixTransportUnitaire_HT DECIMAL(18, 2) NOT NULL DEFAULT 0,
    TauxTVA_Transport DECIMAL(5, 4) NOT NULL DEFAULT 0,
    
    CONSTRAINT FK_Lignes_Ventes FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID)
);

-- 5. TABLE DES DEVIS (Quantitatifs & Estimatifs)
CREATE TABLE Devis (
    DevisID INT PRIMARY KEY IDENTITY(1,1),
    VenteID INT UNIQUE NOT NULL,
    CodeDevis VARCHAR(20) UNIQUE NOT NULL,
    DateCreation DATETIME DEFAULT GETDATE(),
    DateModification DATETIME DEFAULT GETDATE(),
    Statut VARCHAR(20) DEFAULT 'EN ATTENTE',
    CONSTRAINT FK_Devis_Ventes FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID)
);

-- 6. TABLE DES FACTURES
CREATE TABLE Factures (
    FactureID INT PRIMARY KEY IDENTITY(1,1),
    VenteID INT UNIQUE NOT NULL,
    CodeFacture VARCHAR(20) UNIQUE NOT NULL,
    DateFacture DATETIME DEFAULT GETDATE(),
    TotalHT_DZD DECIMAL(18, 2) NOT NULL,
    TotalTVA_DZD DECIMAL(18, 2) NOT NULL,
    TotalTTC_DZD DECIMAL(18, 2) NOT NULL,
    CONSTRAINT FK_Factures_Ventes FOREIGN KEY (VenteID) REFERENCES Ventes(VenteID)
);

-- 7. TABLE DES RÈGLEMENTS (Détails de paiement)
CREATE TABLE Reglements (
    ReglementID INT PRIMARY KEY IDENTITY(1,1),
    FactureID INT NOT NULL,
    ModeReglement VARCHAR(20) NOT NULL,
    MontantRegle_DZD DECIMAL(18, 2) NOT NULL,
    DateReglement DATE NOT NULL,
    
    -- Informations bancaires / Chèque
    NumeroTransaction VARCHAR(50) NULL, -- N° Chèque ou Virement
    NomBanque NVARCHAR(100) NULL,       -- Nom de la banque
    TypeCheque NVARCHAR(50) NULL,       -- Certifié, simple, etc.
    DateEffetTransaction DATE NULL,     -- Date sur le chèque ou virement
    
    CONSTRAINT FK_Reglements_Factures FOREIGN KEY (FactureID) REFERENCES Factures(FactureID),
    CONSTRAINT CHK_ModeReglement CHECK (ModeReglement IN ('ESPECE', 'CHEQUE', 'VIREMENT'))
);
GO

-- 8. TRIGGER POUR MISE À JOUR AUTOMATIQUE DE LA DATE DE MODIFICATION DES DEVIS
CREATE TRIGGER trg_UpdateDevisDate
ON Devis
AFTER UPDATE
AS
BEGIN
    UPDATE Devis
    SET DateModification = GETDATE()
    FROM Devis
    INNER JOIN inserted ON Devis.DevisID = inserted.DevisID;
END;
GO