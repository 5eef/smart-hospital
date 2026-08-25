# Guide de test manuel — Smart Hospital

Ce guide permet de tester localement les principaux parcours du portfolio sans utiliser de mot de passe partagé ni modifier les données de production.

## 1. Démarrer l'application

Prérequis : Git, Docker Desktop et Docker Compose.

```powershell
git clone https://github.com/5eef/smart-hospital.git
cd smart-hospital
Copy-Item backend/.env.example backend/.env
docker compose build
docker compose up -d
docker compose ps
```

Les trois services doivent être actifs : `mysql`, `backend` et `frontend`.

| Service | Adresse attendue |
| --- | --- |
| Application | http://localhost:5173 |
| API | http://localhost:8001/api |
| Liveness | http://localhost:8001/api/health |
| Readiness | http://localhost:8001/api/ready |

Réponses attendues : `/api`, `/api/health` et `/api/ready` retournent HTTP 200. La route `/sanctum/csrf-cookie` retourne HTTP 204.

## 2. Récupérer les emails locaux

Le développement utilise `MAIL_MAILER=log`. Les liens de vérification, d'invitation et de réinitialisation sont écrits dans :

```text
backend/storage/logs/laravel.log
```

Pour suivre le fichier depuis PowerShell :

```powershell
Get-Content backend/storage/logs/laravel.log -Wait
```

Les comptes seedés suivants existent uniquement pour faciliter les scénarios locaux :

- `admin@smarthospital.test`
- `doctor@smarthospital.test`
- `patient@smarthospital.test`

Leurs mots de passe sont aléatoires. Depuis `http://localhost:5173/forgot-password`, demandez un lien pour l'adresse voulue, puis ouvrez l'URL écrite dans le log et choisissez un mot de passe local d'au moins 12 caractères.

## 3. Parcours patient

1. Ouvrir `http://localhost:5173/register` dans une fenêtre privée.
2. Créer un nouveau compte patient.
3. Vérifier que l'accès protégé demande la validation de l'email.
4. Ouvrir le lien de vérification présent dans le log Laravel.
5. Se connecter et consulter le dashboard patient.
6. Créer un rendez-vous futur avec un médecin et un service actifs.
7. Vérifier sa présence dans « Mes rendez-vous ».
8. Tenter un second rendez-vous au même horaire : le conflit doit être refusé.
9. Annuler le rendez-vous et vérifier son nouveau statut.
10. Consulter les notifications et marquer une notification comme lue.
11. Soumettre une modification de profil et vérifier qu'elle reste en attente d'approbation.

## 4. Parcours administrateur

1. Réinitialiser le mot de passe de `admin@smarthospital.test` avec le workflow décrit plus haut.
2. Se connecter et vérifier le dashboard et les statistiques.
3. Créer puis modifier un service hospitalier.
4. Créer un médecin avec une adresse email de test unique.
5. Vérifier que l'interface confirme l'état réel de livraison de l'invitation.
6. Ouvrir le lien d'invitation présent dans le log et définir le mot de passe du médecin.
7. Consulter les patients et rendez-vous paginés.
8. Approuver ou rejeter la demande de modification de profil créée dans le parcours patient.
9. Désactiver un compte de test et vérifier que son historique clinique n'est pas supprimé.

## 5. Parcours médecin

1. Se connecter avec le médecin invité, ou réinitialiser `doctor@smarthospital.test`.
2. Consulter le dashboard, les rendez-vous et la liste des patients liés.
3. Ouvrir un patient lié et vérifier que seules les données autorisées sont visibles.
4. Confirmer un rendez-vous puis le faire évoluer vers un état terminal valide.
5. Créer un dossier médical et une prescription cohérents pour ce patient.
6. Créer un ordre de laboratoire ou d'imagerie.
7. Le passer de `requested` à `in_progress`, puis à `completed` avec un résultat.
8. Vérifier qu'un passage à `completed` sans résultat est refusé.
9. Vérifier qu'un ordre `completed` ou `cancelled` ne peut plus être modifié.

## 6. Contrôles d'autorisation

Utiliser deux fenêtres privées, avec deux rôles ou deux médecins différents.

- Un patient ne doit pas accéder à `/admin` ni `/doctor`.
- Un médecin ne doit pas accéder à `/admin`.
- Un médecin ne doit pas voir les dossiers, prescriptions, rendez-vous ou ordres appartenant uniquement à un autre médecin.
- Un patient ne doit jamais pouvoir consulter le dossier d'un autre patient.
- Une modification envoyée avec une ancienne valeur `version` doit retourner HTTP 409.

Pour vérifier le dernier point, ouvrir la même ressource dans deux sessions, effectuer une première modification, puis soumettre la seconde sans recharger la page.

## 7. Contrôles navigateur

Dans les outils de développement du navigateur :

- vérifier que l'authentification utilise des cookies et non un token dans `localStorage` ;
- vérifier la présence du cookie CSRF/Sanctum lors d'une mutation ;
- vérifier que les réponses 401, 403, 409, 422 et 429 sont gérées proprement ;
- vérifier qu'aucun mot de passe, token ou donnée clinique d'un autre utilisateur n'apparaît dans les réponses réseau.

## 8. Tests automatisés complémentaires

```powershell
docker compose exec backend php artisan test
docker compose exec frontend npm run lint
docker compose exec frontend npm test -- --run
docker compose exec frontend npm run build
```

## 9. Arrêter sans perdre les données

```powershell
docker compose down
```

Cette commande conserve les volumes. N'ajoutez pas `-v` si vous souhaitez préserver la base locale.
