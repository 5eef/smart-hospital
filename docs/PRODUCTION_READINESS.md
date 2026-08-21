# Préparation production

La cible `docker-compose.production.yml` est séparée du compose local. Elle utilise Apache et Nginx, désactive le debug, journalise sur `stderr`, active les cookies sécurisés et démarre un worker de file ainsi que Reverb.

## Déploiement

1. Copier `.env.production.example` vers `.env.production`.
2. Remplacer tous les domaines et secrets `replace-*`. Générer `APP_KEY` avec `php artisan key:generate --show` et utiliser des secrets uniques pour MySQL et Reverb.
3. Placer un reverse proxy TLS devant le frontend, l'API et Reverb. Ne pas exposer MySQL publiquement.
4. Valider puis construire :

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml config
   docker compose --env-file .env.production -f docker-compose.production.yml build
   ```

5. Appliquer les migrations une seule fois avant la bascule :

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml run --rm backend php artisan migrate --force
   ```

6. Démarrer et contrôler l'état :

   ```bash
   docker compose --env-file .env.production -f docker-compose.production.yml up -d
   docker compose --env-file .env.production -f docker-compose.production.yml ps
   docker compose --env-file .env.production -f docker-compose.production.yml logs --since 10m backend queue reverb frontend
   ```

## Contrôles obligatoires avant bascule

- sauvegarde MySQL testée avec restauration sur une instance isolée ;
- TLS valide et domaines CORS/Reverb exacts ;
- secrets fournis par le gestionnaire de secrets de l'hébergeur ;
- supervision des erreurs HTTP, de la file, de Reverb, du disque et de MySQL ;
- politique de rétention des logs et des sauvegardes conforme aux données de santé ;
- aucun compte ou mot de passe de démonstration conservé en production ;
- test manuel des trois rôles sur l'URL finale.

Le fichier `.env.production` contient des secrets et ne doit jamais être ajouté à Git.
