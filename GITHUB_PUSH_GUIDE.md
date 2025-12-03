# Guide: Pousser votre code vers GitHub

## Étape 1: Initialiser Git (si pas déjà fait)

```powershell
# Dans le dossier racine du projet (MedTech)
git init
```

## Étape 2: Vérifier les fichiers à ajouter

```powershell
# Voir les fichiers qui seront ajoutés
git status
```

## Étape 3: Ajouter tous les fichiers

```powershell
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .
```

## Étape 4: Faire un commit

```powershell
# Créer un commit avec un message descriptif
git commit -m "Initial commit: MedTech Innovation Software with eye, lung, skin, and tumor detection"
```

## Étape 5: Créer un dépôt sur GitHub

1. Allez sur [GitHub.com](https://github.com)
2. Cliquez sur le bouton **"+"** en haut à droite
3. Sélectionnez **"New repository"**
4. Donnez un nom à votre dépôt (ex: `MedTech-Innovation-Software`)
5. **Ne cochez PAS** "Initialize with README" (vous avez déjà du code)
6. Cliquez sur **"Create repository"**

## Étape 6: Connecter votre dépôt local à GitHub

```powershell
# Remplacez YOUR_USERNAME et YOUR_REPO_NAME par vos valeurs
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Vérifier que le remote est bien ajouté
git remote -v
```

## Étape 7: Pousser vers GitHub

```powershell
# Pousser vers la branche main (ou master selon votre dépôt)
git branch -M main
git push -u origin main
```

Si vous utilisez GitHub avec authentification par token:

```powershell
# GitHub vous demandera votre nom d'utilisateur et un token d'accès personnel
# Créez un token sur: https://github.com/settings/tokens
git push -u origin main
```

## Commandes utiles pour les prochaines fois

### Voir les changements
```powershell
git status
```

### Ajouter des fichiers modifiés
```powershell
git add .
# ou pour des fichiers spécifiques
git add frontend/src/pages/LungDetection.tsx
```

### Faire un commit
```powershell
git commit -m "Description de vos changements"
```

### Pousser vers GitHub
```powershell
git push
```

### Récupérer les dernières modifications
```powershell
git pull
```

## Note importante sur les fichiers de modèle

Les fichiers de modèle (`.h5`, `.safetensors`, etc.) sont très volumineux (>1GB). GitHub a une limite de 100MB par fichier.

**Options:**
1. **Exclure les modèles** (recommandé pour commencer): Décommentez les lignes dans `.gitignore` concernant les modèles
2. **Utiliser Git LFS** (Large File Storage) pour les gros fichiers:
   ```powershell
   git lfs install
   git lfs track "*.h5"
   git lfs track "*.safetensors"
   git add .gitattributes
   ```

## Résolution de problèmes

### Si vous avez déjà un dépôt GitHub existant
```powershell
# Vérifier les remotes existants
git remote -v

# Si un remote existe déjà, vous pouvez le mettre à jour
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### Si vous avez des erreurs d'authentification
- Créez un **Personal Access Token** sur GitHub
- Utilisez-le comme mot de passe lors du push
- Ou configurez SSH: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

