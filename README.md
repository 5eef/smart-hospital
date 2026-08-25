# Smart Hospital

[![CI](https://github.com/5eef/smart-hospital/actions/workflows/ci.yml/badge.svg)](https://github.com/5eef/smart-hospital/actions/workflows/ci.yml)
![Laravel 12](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Plateforme web de gestion hospitalière réunissant, dans une même application sécurisée, les parcours administrateur, médecin et patient.

Smart Hospital centralise les comptes, services hospitaliers, rendez-vous, dossiers médicaux, prescriptions, ordres cliniques, notifications et demandes de modification de profil. Le frontend React consomme une API Laravel protégée par des sessions first-party Laravel Sanctum.

> Projet full-stack réalisé par [**5eef**](https://github.com/5eef) pour démontrer la conception d'une application métier complète : sécurité applicative, règles cliniques, concurrence, tests automatisés et conteneurisation.

## Ce que ce projet démontre

- Une architecture React/Laravel séparant clairement interface, API, services métier et persistance.
- Des autorisations par rôle et une isolation stricte des données médicales entre médecins et patients.
- Des workflows métier testés pour les rendez-vous, prescriptions, dossiers médicaux et ordres cliniques.
- La gestion de concurrence avec transactions, verrous et verrouillage optimiste par version.
- Une authentification SPA par cookies HttpOnly, CSRF Sanctum, vérification email et rate limiting.
- Une chaîne qualité reproductible avec PHPUnit, Vitest, ESLint, Composer, npm, Docker et GitHub Actions.

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

Les notifications sont persistées en base et exposées par des endpoints REST avec compteur unread_count; aucun serveur WebSocket n’est requis par le frontend actuel.

## Architecture

```text
smart-hospital/
├── backend/
│   ├── app/                 # Contrôleurs API, modèles, services et middleware
│   ├── database/            # Migrations et seeders protégés
│   ├── routes/              # Routes API, web et console
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
Copy-Item backend/.env.example backend/.env
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

## Test manuel

Un parcours complet et reproductible est disponible dans [docs/MANUAL_TESTING.md](docs/MANUAL_TESTING.md).

Pour une vérification rapide après le démarrage Docker :

1. ouvrir http://localhost:5173 ;
2. créer un compte patient depuis /register ;
3. récupérer le lien de vérification dans backend/storage/logs/laravel.log ;
4. tester la prise puis l'annulation d'un rendez-vous ;
5. utiliser /forgot-password avec admin@smarthospital.test pour accéder au parcours administrateur local ;
6. vérifier les parcours médecin, notifications et refus d'accès inter-rôles décrits dans le guide.

Les comptes seedés utilisent volontairement des mots de passe aléatoires. Aucun identifiant secret partagé n'est publié dans ce dépôt.

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
- N’introduire un transport temps réel que si un client frontend et des tests d’isolation de canaux sont livrés ensemble.
- Traiter le découpage du bundle frontend signalé par Vite.

## Developer

**5eef** — développeur full-stack

GitHub : [@5eef](https://github.com/5eef)

Portfolio : ce dépôt présente une réalisation complète, de l'analyse métier aux validations Docker et CI.

## License

Ce projet est distribué sous licence [MIT](LICENSE).

Copyright © 2026 **5eef**.
