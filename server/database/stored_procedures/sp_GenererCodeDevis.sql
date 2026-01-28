-- Stored Procedure pour générer le code devis selon le format XXXX/prefix/yyyy
-- Où XXXX est un nombre incrémentable à 4 chiffres, prefix est le préfixe de l'entreprise, et yyyy est l'année en cours
-- Le compteur est remis à zéro chaque année

-- Supprimer la procédure si elle existe déjà
IF OBJECT_ID('sp_GenererCodeDevis', 'P') IS NOT NULL
    DROP PROCEDURE sp_GenererCodeDevis;
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
    
    -- Obtenir l'année en cours
    SET @AnneeEnCours = YEAR(GETDATE());
    
    -- Obtenir le préfixe de l'entreprise depuis la table ParametresEntreprise
    -- On suppose qu'il n'y a qu'une seule ligne active (Actif = 1) ou la dernière entrée
    SELECT TOP 1 @PrefixeEntreprise = PrefixeEntreprise 
    FROM ParametresEntreprise 
    WHERE Actif = 1
    ORDER BY ParamID DESC;
    
    -- Si on ne trouve pas de préfixe, utiliser une valeur par défaut
    IF @PrefixeEntreprise IS NULL
        SET @PrefixeEntreprise = 'ENT';
    
    -- Vérifier si un compteur existe pour les devis cette année
    IF NOT EXISTS (SELECT 1 FROM Compteurs WHERE TypeDocument = 'DEVIS' AND Annee = @AnneeEnCours)
    BEGIN
        -- Si aucune entrée pour cette année, créer une nouvelle entrée
        -- Mais d'abord, vérifier s'il y avait une entrée pour l'année précédente pour déterminer le point de départ
        INSERT INTO Compteurs (TypeDocument, Prefixe, DernierNumero, Annee, FormatNumero, ReinitialisationAnnuelle)
        VALUES ('DEVIS', @PrefixeEntreprise, 0, @AnneeEnCours, '0000', 1);
        
        SET @NouveauNumero = 1;
    END
    ELSE
    BEGIN
        -- Vérifier si l'année a changé par rapport à la dernière génération
        DECLARE @AncienneAnnee INT;
        SELECT @AncienneAnnee = Annee 
        FROM Compteurs 
        WHERE TypeDocument = 'DEVIS' 
        AND Prefixe = @PrefixeEntreprise;
        
        -- Si l'année a changé, réinitialiser le compteur à 1
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
            -- Incrémenter le dernier numéro
            UPDATE Compteurs 
            SET DernierNumero = DernierNumero + 1,
                DateDernierIncrement = GETDATE()
            WHERE TypeDocument = 'DEVIS';
            
            SELECT @NouveauNumero = DernierNumero 
            FROM Compteurs 
            WHERE TypeDocument = 'DEVIS';
        END
    END
    
    -- Formater le numéro avec des zéros à gauche (4 chiffres)
    SET @NumeroFormate = RIGHT('0000' + CAST(@NouveauNumero AS VARCHAR(10)), 4);
    
    -- Générer le code devis final au format XXXX/prefix/yyyy
    SET @CodeDevis = @NumeroFormate + '/' + @PrefixeEntreprise + '/' + CAST(@AnneeEnCours AS VARCHAR(4));
    
    -- Retourner le code devis généré
    SELECT @CodeDevis AS CodeDevis;
END;
GO