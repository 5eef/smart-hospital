# Backend hardening

## API ajoutée

- `GET /api/health`
- `GET /api/profile`
- `GET|POST /api/profile/change-requests`
- `GET /api/admin/profile-change-requests`
- `PATCH /api/admin/profile-change-requests/{id}/approve`
- `PATCH /api/admin/profile-change-requests/{id}/reject`
- `GET /api/notifications`
- `GET /api/notifications/unread`
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/read-all`

Toutes les routes métier sont protégées par Sanctum et par le contrôle des comptes actifs. Les routes d'approbation exigent le rôle `admin`.

## Workflow de profil

Un patient ou un médecin peut proposer uniquement `name`, `phone`, `locale` et, pour un patient, `address`. La modification reste dans `profile_change_requests` jusqu'à une approbation transactionnelle. Les rôles, mots de passe, identifiants et données médicales ne sont pas acceptés. Une seule demande en attente est autorisée par utilisateur.

## Notifications et Reverb

Les notifications sont enregistrées dans la table existante `notifications`, puis l'événement `notification.created` est diffusé sur le canal privé `user.{id}`. L'endpoint Laravel `/broadcasting/auth` utilise Sanctum et n'autorise que le propriétaire actif du canal.

Configuration de référence :

```dotenv
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=smart-hospital
REVERB_APP_KEY=<random-key>
REVERB_APP_SECRET=<random-secret>
REVERB_HOST=localhost
REVERB_PORT=8080
REVERB_SCHEME=http
REVERB_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Ne pas versionner les vraies valeurs. Après configuration, démarrer le serveur avec :

```bash
php artisan reverb:start
```

Le backend est prêt à diffuser ; l'abonnement Echo/Reverb côté React reste une phase frontend séparée.

## Localisation

Le français est la valeur par défaut. Les catalogues backend `fr`, `en` et `ar` couvrent les erreurs API, validations et notifications. Une locale utilisateur valide prime sur `Accept-Language`.

## Validation

```bash
php artisan optimize:clear
php artisan route:list --path=api
php artisan migrate:status
php artisan test
```

Les deux migrations de cette phase sont additives et réversibles. Ne pas utiliser `migrate:fresh` ou `db:wipe` sur les données existantes.
