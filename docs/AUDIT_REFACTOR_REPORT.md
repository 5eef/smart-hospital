# Rapport d’audit et refonte — SmartHôpital

Date : 18 août 2026

## Stack auditée

- Frontend : React 19, React Router 7, Vite 8, Tailwind CSS 4, Axios et Lucide.
- Backend : Laravel 12, PHP 8.2, Sanctum et MySQL 8.4 (Docker).
- Domaine existant conservé : rôles, utilisateurs, départements, médecins, patients, rendez-vous, dossiers médicaux, prescriptions et notifications.

## Résultats de l’audit

### Critique — corrigé

1. Un patient pouvait envoyer un `patient_id` arbitraire lors de la création d’un rendez-vous. L’API associe désormais systématiquement la demande au patient authentifié avant validation.
2. La création de rendez-vous ne vérifiait ni l’appartenance du médecin au département, ni les conflits médecin/patient au même créneau. Ces contrôles sont maintenant exécutés dans une transaction.
3. Un médecin pouvait créer une consultation pour un patient sans relation de suivi, et prescrire sans vérifier l’appartenance du dossier. Les deux flux sont maintenant restreints aux données du médecin connecté.
4. La suppression d’un médecin ou d’un patient supprimait le profil métier mais laissait le compte utilisateur orphelin. La suppression passe désormais par le compte utilisateur et respecte les cascades de base de données.

### Moyen — corrigé

1. Les listes acceptaient des valeurs `per_page` non bornées et appliquaient parfois un filtre `status` à des modèles qui ne possèdent pas cette colonne. La pagination est bornée entre 1 et 100 et les filtres sont validés par ressource.
2. L’unicité des e-mails médecins et patients n’était pas validée explicitement. Elle est maintenant vérifiée contre `users.email` à la création et à la mise à jour.
3. Les dashboards répétaient des appels de listes alors que l’endpoint dashboard détenait déjà les données nécessaires. Le dashboard admin lit maintenant un endpoint unique, avec nettoyage de l’effet asynchrone.
4. Le hook de ressources ne renvoyait pas les métadonnées de pagination et présentait un risque de rendu en cascade détecté par le linter React. Il expose à présent les métadonnées et charge dans une fonction asynchrone contrôlée.

### Mineur — amélioré

- Libellés, hiérarchie et accessibilité de l’en-tête/side bar harmonisés.
- États de statut cohérents, badges réutilisables, cartes KPI et surfaces médicales uniformes.
- Les erreurs Laravel `errors` sont affichées en priorité côté client au lieu d’un message générique.

## Fichiers métier modifiés

- `backend/app/Http/Controllers/Api/ResourceController.php`
- `backend/app/Http/Controllers/Api/DashboardController.php`
- `backend/app/Models/Department.php`
- `backend/database/migrations/2026_08_18_000000_add_hospital_query_indexes.php`
- `backend/phpunit.xml`
- `backend/tests/Feature/HospitalApiTest.php`

## Frontend et design system

- `frontend/src/components/layout/AppLayout.jsx` : shell médical responsive, navigation active et meilleure accessibilité.
- `frontend/src/components/ui/Button.jsx`, `StatCard.jsx` : tokens d’actions et KPI unifiés.
- Nouveaux composants : `PageHeader`, `StatusBadge`, `Pagination`.
- `frontend/src/features/admin/pages/AdminDashboard.jsx` : dashboard avec données API réelles, graphique SVG des rendez-vous sur six mois, derniers rendez-vous et médecins les plus sollicités.
- `frontend/src/hooks/useResource.js` : état de chargement, erreurs et métadonnées de pagination.
- `frontend/src/utils/formatters.js` et `frontend/src/index.css` : messages de validation plus utiles et tokens visuels globaux.

## Base de données

La migration ajoutée ne modifie ni ne supprime de colonnes. Elle ajoute :

- unicité de `doctors.user_id` et `patients.user_id`, cohérente avec les relations `HasOne` ;
- index de consultation des médecins par département/statut ;
- index de conflit et de filtre sur les rendez-vous ;
- index de liaison médecin/patient des dossiers médicaux.

## Fonctionnalités

| Fonctionnalité | État |
| --- | --- |
| Authentification Sanctum et rôles | existante, conservée |
| CRUD patients, médecins, départements | existant, validation e-mail et suppression renforcées |
| Rendez-vous | amélioré : scope rôle, conflits, disponibilité et filtres API |
| Consultations / prescriptions | amélioré : contrôle d’accès métier médecin-patient |
| Statistiques admin | améliorées : KPIs et séries mensuelles calculés depuis la base |
| Dashboard médical | refondu avec données réelles |

## Tests et vérifications exécutés

| Commande | Résultat |
| --- | --- |
| `composer install --no-interaction --prefer-dist` | réussi |
| `php -l` des contrôleurs et migration modifiés | réussi |
| `php artisan test` | réussi : 5 tests, 12 assertions |
| `php artisan migrate --database=sqlite --pretend` | structure de toutes les migrations validée, dont les index ajoutés |
| `npm ci` | réussi |
| `npm run lint` | réussi |
| `npm run build` | réussi |

Les nouveaux tests couvrent le scope patient lors de la création d’un rendez-vous, la détection de conflit de créneau, l’interdiction d’accès d’un médecin à un patient non suivi et les métadonnées de pagination admin.

## Limites et suites recommandées

1. Le moteur Docker/MySQL local n’était pas accessible depuis cet environnement ; la migration MySQL n’a donc pas été appliquée contre l’instance Docker réelle. Lancer `docker compose up --build` puis `docker compose exec backend php artisan migrate:status` pour la dernière validation d’intégration.
2. Le frontend ne disposait d’aucun framework de test installé. Aucun nouvel outil n’a été ajouté pour éviter une dépendance arbitraire ; Vitest + Testing Library est une prochaine étape appropriée si des tests UI automatisés sont souhaités.
3. Les formulaires administratifs restent des formulaires en page, sans modale ni erreurs affichées par champ. L’API les valide correctement et les retours d’erreur sont désormais lisibles, mais une phase suivante peut introduire `FormField` et des tests d’accessibilité pour une couverture exhaustive.
4. La recherche globale du header est actuellement une affordance de navigation ; les recherches métier restent disponibles dans les modules concernés. Un endpoint de recherche inter-ressources devra définir soigneusement les droits d’accès aux données médicales avant d’être ajouté.

## Addendum du 19 août 2026

### Contrôles réalisés

- `frontend/npm run lint` : réussi.
- `frontend/npm run build` : réussi.
- `backend/php artisan test` : réussi, 5 tests et 12 assertions.
- `backend/php artisan route:list --path=api` : réussi, 15 routes API enregistrées.
- `backend/php artisan migrate:status` : non exécutable depuis cet environnement, l’hôte Docker `mysql` n’est pas résolu.
- Diagnostics VS Code sur les fichiers frontend modifiés : aucune erreur.

### Corrections appliquées

- Le formulaire patients affiche désormais des labels accessibles, valide le nom et l’email avant l’appel API, restitue les erreurs Laravel par champ et bloque le double envoi.
- Les suppressions de patients affichent maintenant une erreur lisible en cas d’échec réseau ou serveur.
- La liste patients utilise les métadonnées de pagination Laravel et revient à la première page lors d’une nouvelle recherche.
- Les agendas admin et médecin proposent le statut `no_show`, déjà autorisé par la validation backend.
- Les mutations et chargements des agendas exposent désormais les erreurs API au lieu de laisser une promesse rejetée sans feedback.

### Écarts restant à traiter

- Les pages médecins, spécialités et rendez-vous utilisent encore des formulaires en ligne sans composant `FormField` partagé ni pagination visible partout.
- Le frontend ne possède toujours pas de suite de tests automatisés dans ses dépendances actuelles.
- Le contrôle complet de la base MySQL et le démarrage Docker restent à exécuter avec Docker Desktop actif.
- Les notions de spécialité sont actuellement portées par `departments`; aucune nouvelle entité `specialties` n’a été ajoutée artificiellement.
