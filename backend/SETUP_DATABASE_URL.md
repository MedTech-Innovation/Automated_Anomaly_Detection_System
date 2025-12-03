# Configuration Rapide de DATABASE_URL

## Méthode Rapide (PowerShell - Session Actuelle)

Ouvrez PowerShell dans le dossier `backend` et exécutez :

```powershell
# Remplacez VOTRE_MOT_DE_PASSE par votre mot de passe PostgreSQL
$env:DATABASE_URL = "postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech"
```

Puis démarrez votre application :
```powershell
python app.py
```

## Méthode Permanente (Recommandée)

### Option 1 : Via PowerShell (Permanent)

```powershell
# Remplacez VOTRE_MOT_DE_PASSE par votre mot de passe PostgreSQL
[System.Environment]::SetEnvironmentVariable("DATABASE_URL", "postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech", "User")
```

**Important** : Redémarrez votre terminal/IDE après cette commande.

### Option 2 : Via l'Interface Windows

1. Appuyez sur `Windows + R`, tapez `sysdm.cpl` et appuyez sur Entrée
2. Allez dans l'onglet **"Avancé"**
3. Cliquez sur **"Variables d'environnement"**
4. Sous **"Variables utilisateur"**, cliquez sur **"Nouveau"**
5. **Nom** : `DATABASE_URL`
6. **Valeur** : `postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech`
7. Cliquez sur **"OK"** partout
8. **Redémarrez votre terminal/IDE**

## Format de DATABASE_URL

```
postgresql+psycopg2://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

**Exemple avec valeurs par défaut** :
```
postgresql+psycopg2://postgres:monmotdepasse@localhost:5432/medtech
```

## Vérification

Pour vérifier que la variable est définie, exécutez dans PowerShell :

```powershell
echo $env:DATABASE_URL
```

## Si vous n'avez pas encore créé la base de données

Exécutez le script automatique :
```powershell
.\setup_database.ps1
```

Ou créez-la manuellement :
```powershell
psql -U postgres -c "CREATE DATABASE medtech;"
```

