# Script PowerShell pour configurer la base de données PostgreSQL
# Exécuter avec : .\setup_database.ps1

Write-Host "=== Configuration de la Base de Données MedTech ===" -ForegroundColor Cyan
Write-Host ""

# Vérifier si PostgreSQL est installé
Write-Host "Vérification de l'installation PostgreSQL..." -ForegroundColor Yellow
$pgPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $pgPath) {
    Write-Host "ERREUR: PostgreSQL n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    Write-Host "Veuillez installer PostgreSQL depuis: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL trouvé: $($pgPath.Source)" -ForegroundColor Green
Write-Host ""

# Demander les informations de connexion
Write-Host "Veuillez entrer les informations de connexion PostgreSQL:" -ForegroundColor Cyan
$dbUser = Read-Host "Nom d'utilisateur (par défaut: postgres)"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres"
}

$dbPassword = Read-Host "Mot de passe" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

$dbHost = Read-Host "Hôte (par défaut: localhost)"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "localhost"
}

$dbPort = Read-Host "Port (par défaut: 5432)"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "5432"
}

$dbName = Read-Host "Nom de la base de données (par défaut: medtech)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "medtech"
}

Write-Host ""
Write-Host "Création de la base de données '$dbName'..." -ForegroundColor Yellow

# Créer la variable d'environnement PGPASSWORD pour psql
$env:PGPASSWORD = $dbPasswordPlain

# Vérifier si la base existe déjà
$checkDb = & psql -U $dbUser -h $dbHost -p $dbPort -lqt | Select-String -Pattern "^\s*$dbName\s"
if ($checkDb) {
    Write-Host "La base de données '$dbName' existe déjà." -ForegroundColor Yellow
    $overwrite = Read-Host "Voulez-vous la recréer? (o/N)"
    if ($overwrite -eq "o" -or $overwrite -eq "O") {
        Write-Host "Suppression de l'ancienne base de données..." -ForegroundColor Yellow
        & psql -U $dbUser -h $dbHost -p $dbPort -c "DROP DATABASE IF EXISTS $dbName;"
    } else {
        Write-Host "Utilisation de la base de données existante." -ForegroundColor Green
    }
}

# Créer la base de données
try {
    & psql -U $dbUser -h $dbHost -p $dbPort -c "CREATE DATABASE $dbName;" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Base de données '$dbName' créée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "La base de données existe peut-être déjà ou une erreur s'est produite." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Erreur lors de la création: $_" -ForegroundColor Red
    exit 1
}

# Construire la DATABASE_URL
$databaseUrl = "postgresql+psycopg2://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"

Write-Host ""
Write-Host "=== Configuration de la Variable d'Environnement ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "DATABASE_URL à définir:" -ForegroundColor Yellow
Write-Host $databaseUrl -ForegroundColor White
Write-Host ""

# Proposer de définir la variable d'environnement
$setEnv = Read-Host "Voulez-vous définir la variable d'environnement DATABASE_URL maintenant? (O/n)"
if ($setEnv -ne "n" -and $setEnv -ne "N") {
    # Définir pour la session actuelle
    $env:DATABASE_URL = $databaseUrl
    Write-Host "Variable d'environnement définie pour cette session PowerShell." -ForegroundColor Green
    
    # Proposer de définir de manière permanente
    $setPermanent = Read-Host "Voulez-vous la définir de manière permanente (variables système)? (O/n)"
    if ($setPermanent -ne "n" -and $setPermanent -ne "N") {
        try {
            [System.Environment]::SetEnvironmentVariable("DATABASE_URL", $databaseUrl, "User")
            Write-Host "Variable d'environnement définie de manière permanente!" -ForegroundColor Green
            Write-Host "Note: Vous devrez peut-être redémarrer votre terminal/IDE pour que les changements prennent effet." -ForegroundColor Yellow
        } catch {
            Write-Host "Erreur lors de la définition permanente: $_" -ForegroundColor Red
            Write-Host "Vous pouvez la définir manuellement dans les Paramètres Windows." -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "=== Prochaines Étapes ===" -ForegroundColor Cyan
Write-Host "1. Installez les dépendances Python: pip install -r requirements.txt" -ForegroundColor White
Write-Host "2. Démarrez l'application Flask: python app.py" -ForegroundColor White
Write-Host "3. La table 'sign_in_logs' sera créée automatiquement au premier démarrage." -ForegroundColor White
Write-Host ""
Write-Host "Configuration terminée!" -ForegroundColor Green

# Nettoyer le mot de passe de la mémoire
$dbPasswordPlain = $null
$env:PGPASSWORD = $null

