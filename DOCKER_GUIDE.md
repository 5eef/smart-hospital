# Smart Hospital — guide Docker

## Développement local

```powershell
docker compose build
docker compose up -d
docker compose ps
```

Services locaux : frontend `http://localhost:5173`, API `http://localhost:8001/api` et MySQL `127.0.0.1:3309`. Ces ports sont liés à l’interface loopback uniquement.

Le backend applique les migrations additives et initialise les rôles. Les données de démonstration ne sont autorisées qu’en environnement `local` ou `testing`; leurs mots de passe sont aléatoires. Utilisez le workflow « mot de passe oublié » et consultez `storage/logs/laravel.log` quand `MAIL_MAILER=log`.

Commandes sûres :

```powershell
docker compose exec backend php artisan migrate:status
docker compose exec backend php artisan test
docker compose exec frontend npm run lint
docker compose exec frontend npm test
docker compose exec frontend npm run build
docker compose logs -f backend
docker compose down
```

`docker compose down` conserve le volume MySQL. Ne supprimez jamais les volumes ni la base sans sauvegarde et autorisation explicites.

## Production

Copiez `.env.production.example` vers un fichier non versionné, remplacez chaque valeur `replace-*` et définissez les domaines réels, le proxy de confiance et le SMTP. Validez ensuite :

```powershell
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

MySQL n’est pas publié. Le backend et le frontend sont liés à `127.0.0.1` pour être servis par un reverse proxy TLS. Reverb est désactivé tant qu’aucun client Echo n’est intégré.
