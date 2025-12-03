# Script rapide pour configurer DATABASE_URL
# Usage: .\setup_env.ps1

Write-Host "=== Configuration de DATABASE_URL ===" -ForegroundColor Cyan
Write-Host ""

# Demander le mot de passe PostgreSQL
$dbPassword = Read-Host "Entrez votre mot de passe PostgreSQL" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

# Valeurs par défaut (modifiez si nécessaire)
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "medtech"

# Construire DATABASE_URL
$databaseUrl = "postgresql+psycopg2://${dbUser}:${dbPasswordPlain}@${dbHost}:${dbPort}/${dbName}"

Write-Host ""
Write-Host "DATABASE_URL généré:" -ForegroundColor Yellow
Write-Host $databaseUrl -ForegroundColor White
Write-Host ""

# Définir pour la session actuelle
$env:DATABASE_URL = $databaseUrl
Write-Host "✓ Variable définie pour cette session PowerShell" -ForegroundColor Green

# Proposer de définir de manière permanente
$setPermanent = Read-Host "Voulez-vous la définir de manière permanente? (O/n)"
if ($setPermanent -ne "n" -and $setPermanent -ne "N") {
    try {
        [System.Environment]::SetEnvironmentVariable("DATABASE_URL", $databaseUrl, "User")
        Write-Host "✓ Variable définie de manière permanente!" -ForegroundColor Green
        Write-Host "⚠ Redémarrez votre terminal/IDE pour que les changements prennent effet." -ForegroundColor Yellow
    } catch {
        Write-Host "✗ Erreur: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Vous pouvez maintenant démarrer l'application avec: python app.py" -ForegroundColor Cyan

# Nettoyer le mot de passe
$dbPasswordPlain = $null
$env:PGPASSWORD = $null

