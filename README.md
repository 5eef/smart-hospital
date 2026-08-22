# Smart Hospital

Plateforme web de gestion hospitalière réunissant, dans une même application sécurisée, les parcours administrateur, médecin et patient.

Smart Hospital centralise les comptes, services hospitaliers, rendez-vous, dossiers médicaux, prescriptions, ordres cliniques, notifications et demandes de modification de profil. Le frontend React consomme une API Laravel protégée par des sessions first-party Laravel Sanctum.

## Présentation

L’application répond au besoin de coordination entre l’administration d’un établissement, ses médecins et ses patients :

- **Administrateur** : supervise les utilisateurs, services, rendez-vous, statistiques et demandes de modification de profil.
- **Médecin** : consulte uniquement ses patients liés, gère ses rendez-vous, dossiers médicaux, prescriptions et ordres cliniques.
- **Patient** : crée son compte, prend ou annule un rendez-vous, consulte son historique autorisé, ses notifications et son profil.

Les accès cliniques sont filtrés côté serveur. Une désactivation ou un archivage conserve l’historique médical au lieu de le supprimer physiquement.

## Fonctionnalités

### Administration

- Tableaux de bord et statistiques issus des données réelles.
- Gestion des services, médecins, patients et rendez-vous.
- Désactivation non destructive des comptes et services.
- Invitation sécurisée des comptes par lien de définition du mot de passe.
- Approbation ou rejet des demandes de modification de profil.
- Journal d’audit métier des opérations sensibles.

### Médecin

- Tableau de bord, rendez-vous et consultations.
- Liste strictement limitée aux patients liés.
- Création et suivi des dossiers médicaux et prescriptions autorisés.
- Ordres de laboratoire ou d’imagerie avec transitions d’état contrôlées.
- Notifications persistantes.

### Patient

- Inscription et vérification de l’adresse email.
- Authentification, récupération et réinitialisation sécurisée du mot de passe.
- Prise de rendez-vous avec contrôle des disponibilités et conflits.
- Consultation des rendez-vous, informations médicales autorisées et notifications.
- Demande de modification de profil soumise à validation.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 19, JavaScript, Vite 8, Tailwind CSS 4, React Router 7, Axios, Lucide React |
| Tests frontend | Vitest, Testing Library, ESLint |
| Backend | PHP 8.2+, Laravel 12, Laravel Sanctum 4 |
| Données | MySQL 8.4; SQLite en mémoire pour les tests |
| Tests backend | PHPUnit 11 |
| Production | Docker, Docker Compose, Apache, Nginx |

Laravel Reverb reste installé pour une évolution future, mais le broadcasting temps réel est volontairement désactivé en production tant qu’aucun client Echo n’est intégré.

## Architecture

```text
smart-hospital/
├── backend/
│   ├── app/                 # Contrôleurs API, modèles, services et middleware
│   ├── database/            # Migrations et seeders protégés
│   ├── routes/              # Routes API, web, console et channels
│   ├── tests/               # Tests PHPUnit
│   └── docker/              # Configuration Apache/PHP
├── frontend/
│   ├── src/                 # Pages, composants, contexte et services API
│   ├── public/              # Ressources statiques
│   └── nginx.production.conf
├── docs/                    # Audits, readiness, maquettes et conception
├── .github/workflows/ci.yml
├── docker-compose.yml
└── docker-compose.production.yml
```

Le navigateur s’authentifie avec une session Laravel et des cookies HttpOnly. Axios envoie les credentials et initialise la protection CSRF via `/sanctum/csrf-cookie`. Aucun secret d’authentification n’est stocké dans `localStorage`; seule la préférence de thème y est conservée.

## Installation locale

### Prérequis

- Git
- Docker Desktop avec Docker Compose

### Démarrage recommandé

```powershell
git clone https://github.com/5eef/smart-hospital.git
cd smart-hospital
docker compose build
docker compose up -d
docker compose ps
```

| Service | URL locale |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:8001/api |
| Liveness | http://localhost:8001/api/health |
| Readiness | http://localhost:8001/api/ready |
| MySQL hôte | 127.0.0.1:3309 |

Le backend installe ses dépendances, applique les migrations additives et exécute les seeders autorisés. Pour arrêter les conteneurs sans supprimer les données :

```powershell
docker compose down
```

### Exécution sans Docker

```powershell
cd backend
composer install
Copy-Item .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

Dans un second terminal :

```powershell
cd frontend
npm ci
npm run dev
```

Configurez auparavant MySQL, CORS, Sanctum et l’URL API selon votre environnement.

## Variables d’environnement

- `backend/.env.example` décrit le développement Laravel.
- `.env.production.example` est le contrat des variables Docker de production.
- Un éventuel `.env` ou `.env.production` réel ne doit jamais être versionné.

Les valeurs `APP_KEY`, mots de passe MySQL/SMTP et secrets éventuels doivent être uniques et fournis par un gestionnaire de secrets. En production, configurez précisément `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, `TRUSTED_PROXIES`, les cookies sécurisés et le SMTP.

## Base de données et seeders

```powershell
docker compose exec backend php artisan migrate:status
docker compose exec backend php artisan migrate
```

`RoleSeeder` initialise de façon idempotente `admin`, `doctor` et `patient`. `DemoDataSeeder` refuse explicitement de s’exécuter hors des environnements `local` et `testing`. Les comptes de démonstration reçoivent des secrets aléatoires : aucun mot de passe partagé n’est prévu. En local, utilisez la récupération de mot de passe avec `MAIL_MAILER=log`.

N’utilisez jamais une commande de reconstruction destructive sur une base contenant des données utiles. Sauvegardez MySQL avant toute migration de production.

## API

Les routes exactes sont consultables avec :

```powershell
docker compose exec backend php artisan route:list --path=api
```

| Groupe | Exemples |
| --- | --- |
| Service | `GET /api`, `GET /api/health`, `GET /api/ready` |
| Authentification | register, login, me, logout, vérification email |
| Mot de passe | forgot-password, reset-password |
| Profil | profil courant et demandes de modification |
| Ressources | departments, doctors, patients, appointments |
| Clinique | medical-records, prescriptions, clinical-orders |
| Notifications | liste, non lues, marquage lu |
| Administration | dashboards et validation des profils |

Les collections sont paginées et les paramètres de filtrage sont validés. Les relations cliniques imbriquées sont limitées au médecin ou patient authentifié.

## Authentification et sécurité

- Sessions first-party Laravel Sanctum, cookies HttpOnly et protection CSRF.
- Cookies `Secure` et chiffrés dans la configuration de production.
- Vérification email des inscriptions patient.
- Liens Password Broker temporaires, réponses anti-énumération et rate limiting.
- Révocation des personal access tokens et sessions lors d’un reset effectif.
- Contrôle des rôles, compte actif et autorisations par ressource.
- Verrouillage transactionnel des réservations concurrentes.
- Archivage/désactivation et conservation de l’historique médical.
- Audit métier sans copie du diagnostic, résultat ou contenu médical complet.
- CORS à origines explicites, CSP, Permissions Policy et logs Apache sans query string.

Les personal access tokens Sanctum sont conservés uniquement pour de futurs clients externes; leur expiration est pilotée par `SANCTUM_EXPIRATION` et leur purge est planifiée quotidiennement.

## Tests et qualité

```powershell
docker compose exec backend php artisan test
docker compose exec frontend npm run lint
docker compose exec frontend npm test
docker compose exec frontend npm run build
```

Une GitHub Actions CI exécute ces contrôles sur chaque push et pull request. Le backend utilise SQLite en mémoire dans la suite automatisée.

## Docker et production

Le compose de développement lance MySQL, Laravel et Vite sur l’interface locale. Le compose de production construit :

- une image Laravel servie par Apache;
- un worker de queue séparé;
- une image React statique servie par Nginx;
- MySQL sur un réseau Docker privé.

Checklist avant déploiement :

- [ ] `APP_ENV=production` et `APP_DEBUG=false`
- [ ] HTTPS terminé par un reverse proxy connu
- [ ] domaines Sanctum/CORS et proxy de confiance exacts
- [ ] cookies Secure et SMTP de production testés
- [ ] secrets uniques hors Git
- [ ] sauvegarde MySQL restaurable vérifiée
- [ ] migrations, tests et build frontend validés
- [ ] endpoints `/api/health` et `/api/ready` supervisés
- [ ] aucun seeder de démonstration exécuté

Consultez [DOCKER_GUIDE.md](DOCKER_GUIDE.md) et [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md).

## Screenshots

Les captures applicatives finales pourront être ajoutées ici :

```text
docs/screenshots/
├── admin-dashboard.png
├── doctor-dashboard.png
└── patient-dashboard.png
```

Aucune capture inexistante n’est affichée dans ce README. Les maquettes historiques restent disponibles dans `docs/maquettes/`.

## Roadmap

- Étendre la couverture de tests frontend sur les parcours CRUD.
- Ajouter monitoring, métriques et alertes de production.
- Déployer et exercer régulièrement la procédure de backup/restore.
- Introduire un pipeline CD avec approbation et rollback.
- Réévaluer Echo/Reverb seulement avec des canaux privés testés côté client.
- Traiter le découpage du bundle frontend signalé par Vite.

## Developer

**Youssef Bough** — développeur full-stack

GitHub : [@5eef](https://github.com/5eef)

Email : [bough.youssef@gmail.com](mailto:bough.youssef@gmail.com)

## License

Copyright © 2026 Youssef Bough. All rights reserved.

This project was created for educational, portfolio and demonstration purposes. No permission is granted to copy, redistribute, resell or commercially exploit the source code without the author's prior authorization.
