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

## Notifications

Les notifications sont enregistrées dans la table notifications et restent strictement rattachées à leur utilisateur. Les endpoints de liste et de compteur renvoient unread_count; les opérations de lecture vérifient le propriétaire. Le frontend recharge ces données via l’API REST et ne dépend d’aucun serveur WebSocket.
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
