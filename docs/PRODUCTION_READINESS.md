# Préparation production

La cible `docker-compose.production.yml` sépare Apache/Laravel, le worker de queue, Nginx/React et MySQL. MySQL n’est jamais publié; les ports HTTP sont liés à `127.0.0.1` pour être placés derrière un reverse proxy TLS. Les notifications persistantes sont servies par l’API REST, sans service WebSocket additionnel.

## Préconditions

- sauvegarde MySQL chiffrée et restauration testée sur une instance isolée;
- DNS et certificats TLS valides;
- gestionnaire de secrets prêt;
- adresse SMTP transactionnelle vérifiée;
- IP ou CIDR exact du reverse proxy connu;
- politique de rétention des audits, logs et sauvegardes approuvée.

## Configuration

Copier `.env.production.example` vers `.env.production` sans versionner ce dernier. Remplacer toutes les valeurs d’exemple et vérifier notamment :

```text
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com
SANCTUM_STATEFUL_DOMAINS=app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
TRUSTED_PROXIES=<IP/CIDR exact du proxy>
SESSION_SECURE_COOKIE=true
SESSION_ENCRYPT=true
```

Le proxy TLS doit ajouter les en-têtes `X-Forwarded-For`, `X-Forwarded-Proto` et `X-Forwarded-Host`. N’utilisez pas `*` dans `TRUSTED_PROXIES`. Activez HSTS au niveau du proxy HTTPS seulement après validation de tous les sous-domaines concernés.

## Vérification email et comptes historiques

- Les inscriptions autonomes restent non vérifiées jusqu’au clic sur le lien signé.
- Les comptes créés par un administrateur reçoivent une invitation individuelle via le Password Broker. Un échec SMTP est enregistré comme failed et ne doit jamais être présenté comme un succès.
- La migration historique de vérification est volontairement non mutante. Elle ne renseigne jamais automatiquement email_verified_at.
- Pour un compte historique non vérifié, un administrateur doit d’abord confirmer l’identité et la propriété de l’adresse, consigner cette décision selon la politique interne, puis envoyer un lien individuel. Une mise à jour SQL globale vers la date courante est interdite.
- Avant toute campagne d’invitations, valider le SMTP sur un compte de test et surveiller les échecs sans journaliser les liens ni les jetons.

## Déploiement

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml run --rm backend php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Contrôler ensuite `/api`, `/api/health`, `/api/ready`, l’envoi d’un email, la file et les parcours des trois rôles.

## Sauvegarde et rollback

Avant migration, créer une sauvegarde cohérente MySQL avec l’outil géré du fournisseur ou `mysqldump --single-transaction`. Vérifier son checksum et sa restauration hors production. Pour un rollback applicatif, redéployer l’image précédente; ne lancer `migrate:rollback` que si la migration concernée a été explicitement qualifiée réversible et si son impact sur les données est compris. La migration d’archivage/audit est additive.

## Supervision

- liveness : `GET /api/health`;
- readiness DB/cache : `GET /api/ready`;
- erreurs HTTP 5xx, latence et saturation Apache/PHP;
- profondeur et échecs de queue;
- capacité MySQL, réplication et sauvegardes;
- expiration des certificats et échec SMTP;
- croissance et accès à `audit_logs`.
