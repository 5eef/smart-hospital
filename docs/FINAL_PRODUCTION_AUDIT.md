# Audit final de production — Smart Hospital

**Date :** 22 août 2026  
**Branche auditée :** `backend-hardening`  
**Objectif :** audit, correction, hardening, tests et validation de préparation production sans refonte visuelle.

## État initial

La baseline était fonctionnelle : 21 tests Laravel (161 assertions), 9 tests Vitest, ESLint et le build Vite passaient. Docker développement exécutait Laravel, React et MySQL. Plusieurs contrôles existants validaient cependant des comportements devenus non conformes : tokens Bearer SPA dans `localStorage`, `/api` en 404 et suppression physique.

## Problèmes confirmés

- mots de passe fixes lors de la création et du reset administrateur;
- jeton Sanctum navigateur durable dans `localStorage`;
- `SANCTUM_EXPIRATION` ignoré;
- relations cliniques imbriquées non filtrées par médecin;
- cascades et endpoints de suppression destructifs;
- réservation sans verrou transactionnel;
- contrôle de disponibilité rejoué lors d’un simple changement de statut;
- transitions libres des ordres cliniques;
- diffusion temps réel synchrone exposée sans consommateur frontend;
- comptes de démonstration possibles en production;
- absence de root API/readiness métier;
- query strings présentes dans les logs Apache;
- ports inutilement publics;
- absence de récupération de mot de passe, vérification email, audit métier, 404 frontend et error boundary;
- documentation contenant mots de passe fixes et commandes destructrices.

## Corrections effectuées

- session Laravel Sanctum first-party, cookies HttpOnly, CSRF et credentials Axios;
- Password Broker pour invitation/reset, secret initial aléatoire et révocation tokens/sessions;
- vérification email et rate limiting des endpoints sensibles;
- expiration PAT reliée à l’environnement et purge quotidienne;
- relations cliniques imbriquées filtrées et attributs utilisateur minimisés;
- désactivation, annulation ou archivage non destructif;
- audit métier sans contenu médical;
- transactions et `lockForUpdate` sur les réservations;
- contrôle des départements actifs et transitions cliniques terminales;
- surface temps réel inutilisée retirée, notifications DB et endpoints REST conservés;
- seeders rôles/demo séparés avec garde d’environnement;
- root API, liveness et readiness;
- logs Apache sans query string, CSP et Permissions Policy;
- ports loopback, MySQL privé et proxies explicites;
- CI GitHub Actions backend/frontend.

## Migrations ajoutées

`2026_08_22_000000_add_archiving_and_audit_logs.php` ajoute `archived_at` aux dossiers/prescriptions et crée `audit_logs`. Elle ne supprime aucune donnée existante.

`2026_08_22_000100_grandfather_existing_email_verification.php` marque comme vérifiés les comptes déjà présents avant l'activation de la vérification d'adresse afin de ne pas bloquer l'exploitation existante.

## Tests renforcés

Session Sanctum sans token, santé/readiness, Password Broker, révocation, confidentialité Doctor A/Doctor B, suppression non destructive, disponibilité des rendez-vous, transitions cliniques, AuthContext sans stockage sensible et ErrorBoundary sûr.

## Résultats finaux

- PHP : syntaxe valide sur `app`, `bootstrap`, `config`, `database` et `routes`.
- Laravel/PHPUnit : **28 tests, 196 assertions, succès**.
- Frontend/Vitest : **9 fichiers, 14 tests, succès**.
- ESLint : succès.
- Vite production build : succès; avertissement non bloquant sur le bundle principal de 515 kB.
- Composer audit : aucune advisory de sécurité.
- npm audit : 0 vulnérabilité.
- Docker développement : backend, frontend et MySQL démarrés; MySQL healthy; ports loopback.
- API : `/api`, `/api/health`, `/api/ready` répondent HTTP 200.
- Docker production : images Apache/Laravel et Nginx/React construites avec succès.
- Smoke test production : root API HTTP 200; en-têtes CSP, Permissions Policy, frame/referrer/content-type présents; conteneurs temporaires arrêtés.

## Commandes exécutées

```text
git status / branch / log
docker compose ps
php artisan about / route:list / migrate:status / test
npm run lint / npm test / npm run build
composer validate / composer audit
npm audit
docker compose config / production config / production build
```

## Risques restant

- bundle frontend principal légèrement supérieur à 500 kB avant gzip;
- tout ajout futur de temps réel exige un client complet et des tests d’isolation;
- HSTS à activer sur le reverse proxy TLS final;
- rétention légale à valider selon la juridiction;
- concurrence multi-processus à tester sous charge MySQL réelle.

## Checklist de déploiement

- [ ] sauvegarde/restauration MySQL testée;
- [ ] secrets et SMTP réels hors Git;
- [ ] domaines CORS/Sanctum et proxy exacts;
- [ ] images construites et scannées;
- [ ] migrations appliquées une fois;
- [ ] tests automatiques verts;
- [ ] trois rôles testés sur HTTPS;
- [ ] readiness, queue, SMTP et audits supervisés;
- [ ] aucun compte demo en production.

## Rollback et restauration

Conserver l’image précédente et une sauvegarde pré-migration. En cas d’incident, arrêter le trafic, redéployer l’image précédente et restaurer la sauvegarde uniquement si une corruption est confirmée. Ne jamais improviser une suppression de volume ou un rollback SQL sur la base active.
