# Smart Hospital

Application web de gestion hospitalière conçue autour de trois espaces sécurisés : **administration**, **médecin** et **patient**. Le projet centralise les rendez-vous, les dossiers médicaux, les prescriptions, les spécialités et la gestion des utilisateurs.

## Aperçu

Smart Hospital met l'accent sur une expérience claire selon le rôle connecté :

- **Administrateur** : pilotage des médecins, patients, spécialités, rendez-vous et statistiques.
- **Médecin** : consultation des patients, suivi des consultations et des rendez-vous.
- **Patient** : prise de rendez-vous, accès à son dossier médical et mise à jour de son profil.

L'accès aux ressources est protégé par une authentification par jetons et une gestion des rôles.

## Fonctionnalités

- Inscription, connexion, déconnexion et gestion du profil.
- Authentification API avec Laravel Sanctum.
- Contrôle d'accès par rôles : administrateur, médecin et patient.
- Gestion des départements, médecins et patients.
- Gestion des rendez-vous et des consultations.
- Dossiers médicaux, prescriptions et notifications.
- Tableaux de bord adaptés à chaque rôle.
- API REST et interface React avec routes protégées.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS, Axios |
| Backend | PHP 8.2, Laravel 12, Laravel Sanctum |
| Base de données | MySQL 8.4 |
| Conteneurisation | Docker et Docker Compose |

## Architecture

```text
smart-hospital/
├── frontend/        # Interface React et tableaux de bord
├── backend/         # API Laravel, modèles, migrations et tests
├── database/        # Scripts SQL et diagrammes de données
├── docs/            # Cahier des charges, maquettes, UML et présentation
└── docker-compose.yml
```

Les données métier couvrent les utilisateurs et rôles, départements, médecins, patients, rendez-vous, dossiers médicaux, prescriptions et notifications.

## Démarrage rapide avec Docker

### Prérequis

- Docker Desktop avec Docker Compose.

### Lancer l'application

```bash
docker compose up --build
```

Les services démarrent aux adresses suivantes :

| Service | Adresse |
| --- | --- |
| Frontend | http://localhost:5173 |
| API Laravel | http://localhost:8001/api |
| MySQL | localhost:3309 |

Au démarrage, le conteneur backend installe les dépendances Composer puis applique les migrations et les données d'amorçage.

Pour arrêter les services :

```bash
docker compose down
```

> Les identifiants présents dans `docker-compose.yml` servent uniquement au développement local. Utilisez des secrets et une configuration d'environnement distincte avant toute mise en production.

## Développement local

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Configurez ensuite la connexion MySQL dans `backend/.env` selon votre environnement local.

## Documentation

Le dossier [`docs/`](docs/) contient le cahier des charges ainsi que les maquettes et livrables de conception. Les scripts et diagrammes de base de données sont disponibles dans [`database/`](database/).

## Auteur

**Youssef Bough** — Développeur full-stack  
Pseudo : [Seef590](mailto:bough.youssef@gmail.com)  
Contact : [bough.youssef@gmail.com](mailto:bough.youssef@gmail.com)

Ce projet fait partie de mon portfolio et illustre ma capacité à concevoir une application métier complète, de l'interface utilisateur à l'API sécurisée et à la modélisation des données.

## Pistes d'évolution

- Ajout de tests automatisés métier et d'intégration front-end.
- Journalisation et audit des actions sensibles.
- Gestion des fichiers médicaux et des pièces jointes.
- Déploiement avec variables d'environnement sécurisées et pipeline CI/CD.
