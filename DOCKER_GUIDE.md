# Smart Hospital - Docker

## Lancer le projet

```powershell
cd "C:\Users\seef7\OneDrive\Desktop\site_medical\smart-hospital"
docker compose up --build
```

Le site sera disponible ici :

- Frontend React : http://localhost:5173
- Backend Laravel API : http://localhost:8001/api
- MySQL : localhost:3309

## Comptes de test

```text
admin@smarthospital.test / password
doctor@smarthospital.test / password
patient@smarthospital.test / password
```

## Commandes utiles

```powershell
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend php artisan migrate:fresh --seed
docker compose down
docker compose down -v
```

`docker compose down -v` supprime aussi la base MySQL Docker.

## Tester manuellement

1. Ouvrir `http://localhost:5173` et vérifier la page d'accueil.
2. Se connecter avec l'un des comptes de test ci-dessus.
3. Vérifier le dashboard correspondant au rôle.
4. Dans l'espace admin, tester la création, modification, recherche et suppression d'un patient.
5. Tester les mêmes opérations pour un médecin et une spécialité.
6. Créer un rendez-vous, modifier son statut, puis vérifier le contrôle de conflit de créneau.
7. Ouvrir les espaces médecin et patient et vérifier leurs données filtrées.
8. Ouvrir les outils développeur du navigateur et vérifier l'absence d'erreur dans Console et Network.

## Publier sur GitHub

Depuis la racine du projet :

```powershell
git init
git add .
git commit -m "Initial Smart Hospital application"
git branch -M main
git remote add origin https://github.com/<utilisateur>/<depot>.git
git push -u origin main
```

Remplace `<utilisateur>/<depot>` par l'URL de ton dépôt GitHub. Ne publie jamais les fichiers `.env`, les mots de passe ou des tokens.
