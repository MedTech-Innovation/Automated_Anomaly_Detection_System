# Création du fichier .env

## Instructions

1. **Copiez le fichier exemple** :
   ```powershell
   cd backend
   Copy-Item env.example .env
   ```

2. **Éditez le fichier `.env`** et remplacez `VOTRE_MOT_DE_PASSE` par votre mot de passe PostgreSQL :
   ```
   DATABASE_URL=postgresql+psycopg2://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/medtech
   ```

   **Exemples** :
   - Mot de passe simple : `mypassword123`
     ```
     DATABASE_URL=postgresql+psycopg2://postgres:mypassword123@localhost:5432/medtech
     ```
   - Mot de passe avec caractères spéciaux : `motdep@ssé123`
     ```
     DATABASE_URL=postgresql+psycopg2://postgres:motdep@ssé123@localhost:5432/medtech
     ```
   
   **Note** : Les caractères spéciaux (é, è, @, #, etc.) dans votre mot de passe sont automatiquement encodés par le code. Écrivez votre mot de passe tel quel dans le fichier `.env`.

3. **Installez python-dotenv** (si pas déjà fait) :
   ```powershell
   pip install python-dotenv
   ```

4. **Démarrez l'application** :
   ```powershell
   python app.py
   ```

## ⚠️ Important

- Le fichier `.env` est dans `.gitignore` et ne sera **jamais** commité dans Git
- Ne partagez jamais votre fichier `.env` avec d'autres personnes
- Utilisez `env.example` comme template pour les autres développeurs

