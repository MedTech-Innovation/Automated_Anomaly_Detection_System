-- Script SQL pour créer la base de données MedTech
-- Exécuter avec : psql -U postgres -f create_database.sql

-- Créer la base de données
CREATE DATABASE medtech
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'French_France.1252'
    LC_CTYPE = 'French_France.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Commentaire
COMMENT ON DATABASE medtech IS 'Base de données pour l''application MedTech Innovation - Logs de connexion';

-- Note : La table sign_in_logs sera créée automatiquement par SQLAlchemy
-- au premier démarrage de l'application Flask si DATABASE_URL est configuré

