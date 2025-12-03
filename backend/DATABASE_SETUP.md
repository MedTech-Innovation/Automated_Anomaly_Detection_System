# Guide de Configuration de la Base de Données PostgreSQL

Ce guide vous explique comment créer et configurer la base de données PostgreSQL pour l'application MedTech Innovation.

## Prérequis

1. **PostgreSQL installé** sur votre système
   - Télécharger depuis : https://www.postgresql.org/download/windows/
   - Ou installer via Chocolatey : `choco install postgresql`

2. **Service PostgreSQL en cours d'exécution**
   - Vérifier dans les Services Windows que "postgresql-x64-XX" est démarré

## Méthode 1 : Via pgAdmin (Interface Graphique)

### Étape 1 : Ouvrir pgAdmin
1. Ouvrez **pgAdmin 4** depuis le menu Démarrer
2. Connectez-vous avec le mot de passe que vous avez défini lors de l'installation

### Étape 2 : Créer la base de données
1. Dans le panneau de gauche, cliquez droit sur **"Databases"**
2. Sélectionnez **"Create"** → **"Database..."**
3. Dans l'onglet **"General"** :
   - **Name** : `medtech`
   - **Owner** : `postgres` (ou votre utilisateur)
4. Cliquez sur **"Save"**

### Étape 3 : Récupérer les informations de connexion
- **Host** : `localhost` (ou `127.0.0.1`)
- **Port** : `5432` (port par défaut)
- **Database** : `medtech`
- **User** : `postgres` (ou votre utilisateur)
- **Password** : Le mot de passe que vous avez défini

## Méthode 2 : Via la Ligne de Commande (psql)

### Étape 1 : Ouvrir psql
1. Ouvrez **PowerShell** ou **Invite de commandes**
2. Naviguez vers le dossier bin de PostgreSQL (exemple) :
   ```powershell
   cd "C:\Program Files\PostgreSQL\16\bin"
   ```
3. Exécutez psql :
   ```powershell
   .\psql.exe -U postgres
   ```
4. Entrez votre mot de passe PostgreSQL

### Étape 2 : Créer la base de données
Dans le prompt psql, exécutez :
```sql
CREATE DATABASE medtech;
```

### Étape 3 : Vérifier la création
```sql
\l
```
Vous devriez voir `medtech` dans la liste des bases de données.

### Étape 4 : Quitter psql
```sql
\q
```

## Méthode 3 : Via SQL Script

Créez un fichier `create_database.sql` avec le contenu suivant :

```sql
-- Créer la base de données
CREATE DATABASE medtech
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'French_France.1252'
    LC_CTYPE = 'French_France.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Se connecter à la base de données
\c medtech

-- La table sera créée automatiquement par SQLAlchemy au démarrage de l'application
```

Puis exécutez :
```powershell
psql -U postgres -f create_database.sql
```

## Configuration de l'Application

### Étape 1 : Définir la variable d'environnement DATABASE_URL

#### Windows PowerShell :
```powershell
$env:DATABASE_URL = "postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech"
```

#### Windows CMD :
```cmd
set DATABASE_URL=postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech
```

#### Permanent (Recommandé) - Variables d'environnement système :
1. Ouvrez **Paramètres Windows** → **Système** → **À propos** → **Paramètres système avancés**
2. Cliquez sur **"Variables d'environnement"**
3. Sous **"Variables utilisateur"**, cliquez sur **"Nouveau"**
4. **Nom de la variable** : `DATABASE_URL`
5. **Valeur de la variable** : `postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech`
6. Cliquez sur **"OK"** et redémarrez votre terminal/IDE

### Étape 2 : Installer les dépendances Python
```powershell
cd backend
pip install -r requirements.txt
```

### Étape 3 : Démarrer l'application
```powershell
python app.py
```

La table `sign_in_logs` sera créée automatiquement au premier démarrage si la connexion à la base de données est réussie.

## Vérification

### Vérifier que la table a été créée (via pgAdmin) :
1. Dans pgAdmin, développez **Databases** → **medtech** → **Schemas** → **public** → **Tables**
2. Vous devriez voir la table **`sign_in_logs`**

### Vérifier via psql :
```powershell
psql -U postgres -d medtech -c "\dt"
```

Vous devriez voir :
```
              List of relations
 Schema |     Name      | Type  |  Owner
--------+---------------+-------+----------
 public | sign_in_logs  | table | postgres
```

## Format de la Variable DATABASE_URL

Le format général est :
```
postgresql+psycopg2://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

Exemples :
- Local avec utilisateur par défaut : `postgresql+psycopg2://postgres:password@localhost:5432/medtech`
- Avec utilisateur personnalisé : `postgresql+psycopg2://medtech_user:secret123@localhost:5432/medtech`
- Serveur distant : `postgresql+psycopg2://user:pass@192.168.1.100:5432/medtech`

## Dépannage

### Erreur : "could not connect to server"
- Vérifiez que le service PostgreSQL est démarré
- Vérifiez que le port 5432 est correct
- Vérifiez votre firewall

### Erreur : "password authentication failed"
- Vérifiez votre mot de passe dans DATABASE_URL
- Réinitialisez le mot de passe si nécessaire

### Erreur : "database does not exist"
- Assurez-vous d'avoir créé la base de données `medtech`
- Vérifiez le nom dans DATABASE_URL

### Erreur : "No module named 'psycopg2'"
- Installez les dépendances : `pip install -r requirements.txt`
- Ou installez manuellement : `pip install psycopg2-binary`

## Notes de Sécurité

⚠️ **Important** : Ne commitez jamais votre `DATABASE_URL` avec un mot de passe dans le contrôle de version (Git).

Pour la production, utilisez :
- Variables d'environnement système
- Fichiers `.env` (avec `.gitignore`)
- Services de gestion de secrets (Azure Key Vault, AWS Secrets Manager, etc.)

