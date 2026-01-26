# Procédures Stockées

Ce dossier contient les procédures stockées utilisées dans l'application de gestion de prestation.

## sp_GenererCodeDevis

Cette procédure stockée génère un code devis unique selon le format suivant : `XXXX/PREFIX/yyyy`

### Format du code devis

- `XXXX` : Numéro incrémental à 4 chiffres (ex. 0001, 0002, ...)
- `PREFIX` : Préfixe de l'entreprise récupéré depuis la table `ParametresEntreprise`
- `yyyy` : Année en cours

### Fonctionnalités

1. **Incrémentation automatique** : La procédure incrémente automatiquement le numéro à chaque appel
2. **Gestion annuelle** : Le compteur est remis à zéro chaque année civile
3. **Récupération du préfixe** : Le préfixe est récupéré dynamiquement depuis la table `ParametresEntreprise`
4. **Stockage du compteur** : Les compteurs sont stockés dans la table `Compteurs` pour persistance

### Exemple

Si le préfixe de l'entreprise est `GV`, alors le 1er devis de l'année 2026 sera :
- `0001/GV/2026`
- Le devis suivant sera : `0002/GV/2026`
- À partir du 1er janvier 2027, le premier devis sera : `0001/GV/2027`

### Utilisation

```sql
EXEC sp_GenererCodeDevis;
```

La procédure retourne une seule colonne `CodeDevis` contenant le code généré.

### Tables utilisées

- `ParametresEntreprise` : Pour récupérer le préfixe de l'entreprise
- `Compteurs` : Pour stocker et gérer les compteurs de numérotation