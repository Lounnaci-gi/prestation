-- Test de la procédure stockée pour générer le code devis
-- Ce script teste la procédure sp_GenererCodeDevis

-- Assurons-nous d'abord qu'une entrée existe dans ParametresEntreprise
IF NOT EXISTS (SELECT * FROM ParametresEntreprise)
BEGIN
    INSERT INTO ParametresEntreprise (
        NomEntreprise, AdresseSiegeSocial, TelephonePrincipal, EmailPrincipal,
        PrefixeEntreprise, ExerciceComptable
    )
    VALUES (
        'Entreprise Test', 'Adresse Test', '0123456789', 'test@email.com',
        'GV', 2026
    );
END

-- Tester la procédure stockée
EXEC sp_GenererCodeDevis;

-- Vérifier le contenu de la table Compteurs après l'appel
SELECT * FROM Compteurs WHERE TypeDocument = 'DEVIS';

-- Réinitialiser le compteur pour tester à nouveau
-- UPDATE Compteurs SET DernierNumero = 0 WHERE TypeDocument = 'DEVIS';

-- Relancer la procédure pour vérifier l'incrémentation
-- EXEC sp_GenererCodeDevis;