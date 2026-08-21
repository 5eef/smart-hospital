# Inventaire i18n du frontend

Cet inventaire a été produit par une lecture seule de `frontend/src`. Aucun fichier frontend n'a été modifié pendant la phase de durcissement backend.

## État actuel

- La langue visible est principalement le français, avec quelques libellés anglais dans les données de démonstration.
- Les textes sont écrits directement dans les composants JSX et dans `data/mockData.js`.
- Il n'existe pas encore de catalogue de traductions, de contexte de langue, ni de formatage des dates/nombres piloté par la locale.
- Les réponses backend acceptent désormais `fr`, `en` et `ar`, ainsi que l'en-tête `Accept-Language`.

## Groupes de clés recommandés

### `common`

Actions et états partagés : `save`, `saving`, `cancel`, `edit`, `delete`, `confirm`, `close`, `search`, `filter`, `export`, `loading`, `empty`, `previous`, `next`, `page`, `results`, `unavailable`, `view_all`, `yes`, `no`.

Sources principales :

- `components/ui/{Modal,Pagination,SearchField,StatusBadge,Charts}.jsx`
- `components/layout/AppLayout.jsx`
- `utils/formatters.js`

### `navigation`

Marque et navigation par rôle : portail administrateur, espace médecin, espace patient, tableau de bord, médecins, patients, spécialités, rendez-vous, statistiques, consultations, dossier médical, profil, paramètres, notifications et déconnexion.

Source principale : `components/layout/AppLayout.jsx`.

### `auth`

Connexion, inscription, nom, adresse e-mail, téléphone, mot de passe, confirmation, compte existant, création de compte, erreurs et états de chargement.

Sources : `features/auth/LoginPage.jsx`, `features/auth/RegisterPage.jsx`, `routes/ProtectedRoute.jsx`.

### `admin.dashboard`

Accueil administrateur, indicateurs patients/médecins/rendez-vous/revenus, activité récente, tendances et raccourcis.

Source : `features/admin/pages/AdminDashboard.jsx`.

### `admin.doctors`

Gestion des médecins, statistiques, recherche, filtres, tableau, formulaire, spécialité, licence, statut, activation du compte, réinitialisation du mot de passe, confirmations et erreurs CRUD.

Source : `features/admin/pages/AdminDoctorsPage.jsx`.

### `admin.patients`

Gestion des patients, recherche, filtres, dossier, date de naissance, groupe sanguin, adresse, création/modification/suppression et messages de validation.

Source : `features/admin/pages/AdminPatientsPage.jsx`.

### `admin.specialties`

Spécialités/départements, médecins actifs, utilisation, création, modification, suppression, performance et états opérationnels.

Source : `features/admin/pages/AdminSpecialtiesPage.jsx`.

### `admin.appointments`

Gestion et filtrage des rendez-vous, date, département, statut, patient, médecin, export et actions.

Source : `features/admin/pages/AdminAppointmentsPage.jsx`.

### `admin.statistics`

Statistiques générales, périodes, revenus, croissance, répartition par spécialité, occupation, performance médicale et export.

Source : `features/admin/pages/AdminStatisticsPage.jsx`.

### `doctor`

Accueil clinique, patients suivis, agenda, consultations, diagnostics, allergies, traitements, notes, laboratoire, imagerie, dossiers récents, sélection du patient et changements de statut.

Sources : `features/doctor/pages/*.jsx`.

### `patient`

Accueil patient, rendez-vous, nouvelle demande, choix de spécialité/médecin/date/heure, dossier médical, prescriptions, profil, coordonnées et messages de mise à jour.

Sources : `features/patient/pages/*.jsx`.

### `status`

Valeurs à centraliser : `active`, `inactive`, `leave`, `pending`, `confirmed`, `cancelled`, `completed`, `no_show`, `stable`, `urgent`, `planned`, `in_progress`.

Sources : `components/ui/StatusBadge.jsx`, pages de rendez-vous et `data/mockData.js`.

### `errors` et `notices`

Erreur générique, chargement impossible, enregistrement impossible, suppression impossible, confirmation de suppression, opération réussie, demande envoyée et statut mis à jour.

Sources : `utils/formatters.js`, hooks et toutes les pages de fonctionnalités.

### `accessibility`

Libellés `aria-label` pour menu, navigation mobile, notifications, paramètres, pagination, graphiques et boutons d'action sur une ligne de tableau.

Sources : `components/layout`, `components/ui` et pages d'administration.

### `mockData`

Les intitulés, dates relatives, spécialités, descriptions, états et actions de `data/mockData.js` doivent être remplacés par des clés ou des valeurs neutres fournies par l'API. Les noms propres et identifiants ne doivent pas être traduits.

## Checklist fichier par fichier

| Fichier | Chaînes visibles à migrer |
|---|---|
| `components/layout/AppLayout.jsx` | Tous les menus par rôle, noms des portails, rôles, « Se déconnecter », recherche globale, fermeture du menu, notifications, paramètres et thème |
| `components/ui/Modal.jsx` | Fermeture de la fenêtre et libellé accessible |
| `components/ui/Pagination.jsx` | résultat(s), page précédente/suivante et « Page … / … » |
| `components/ui/StatusBadge.jsx` | Actif, Inactif, En congé, En attente, Confirmé, Annulé, Terminé, Absent |
| `components/ui/Charts.jsx` | « Graphique d'évolution » et libellés des séries |
| `utils/formatters.js` | « Une erreur est survenue. » et formats de date/heure |
| `routes/ProtectedRoute.jsx` | État d'attente pendant la restauration de session |
| `features/auth/LoginPage.jsx` | Titre, description, e-mail, mot de passe, connexion, chargement, inscription et erreurs |
| `features/auth/RegisterPage.jsx` | Création de compte patient, champs, confirmation du mot de passe, actions et erreurs |
| `features/landing/LandingPage.jsx` | Navigation publique, titre marketing, description, fonctionnalités et appels à l'action |
| `features/admin/pages/AdminDashboard.jsx` | Bienvenue, cartes d'indicateurs, activité/tendances, derniers rendez-vous et médecins vedettes |
| `features/admin/pages/AdminDoctorsPage.jsx` | Gestion des médecins, quatre statistiques, recherche, tableau, formulaire, confirmations CRUD et réinitialisation |
| `features/admin/pages/AdminPatientsPage.jsx` | Gestion des patients, statistiques, filtres, dossier, formulaire, import/analyse et confirmations CRUD |
| `features/admin/pages/AdminSpecialtiesPage.jsx` | Gestion des spécialités, cartes, utilisation, performance, formulaire et confirmations CRUD |
| `features/admin/pages/AdminAppointmentsPage.jsx` | Gestion des rendez-vous, filtres, tableau, statuts, formulaire, export et messages d'action |
| `features/admin/pages/AdminStatisticsPage.jsx` | Statistiques générales, période, revenus, occupation, répartition, performance et export |
| `features/doctor/pages/DoctorDashboard.jsx` | Salutation, indicateurs, prochains rendez-vous, activité récente et consultation |
| `features/doctor/pages/DoctorPatientsPage.jsx` | Mes patients, recherche, groupe, naissance, consulter, dossier et états vides/erreurs |
| `features/doctor/pages/DoctorAppointmentsPage.jsx` | Mon agenda, filtre de statut, rendez-vous, consultation et messages de mise à jour |
| `features/doctor/pages/DoctorConsultationsPage.jsx` | File/consultations, dossier sélectionné, diagnostic, allergies, traitements, notes et actions rapides |
| `features/patient/pages/PatientDashboard.jsx` | Accueil, raccourcis, rendez-vous, dossier, indicateurs et alertes/messages |
| `features/patient/pages/PatientAppointmentsPage.jsx` | Mes rendez-vous, statut, médecin, spécialité, date et états vide/erreur |
| `features/patient/pages/PatientAppointmentPage.jsx` | Nouveau rendez-vous, choix spécialité/médecin/date/heure, motif, confirmation et erreurs |
| `features/patient/pages/PatientMedicalRecordPage.jsx` | Dossier médical, historique, diagnostics, traitements, allergies, ordonnances et états vides |
| `features/patient/pages/PatientProfilePage.jsx` | Mon profil, coordonnées, langue future, enregistrer/annuler et messages de mise à jour |
| `data/mockData.js` | Tous les labels, spécialités, descriptions, dates relatives, statuts, actions et textes de cartes |

Les attributs construits dynamiquement doivent aussi devenir des traductions paramétrées, par exemple « Modifier {name} », « Supprimer {name} », « Changer le statut de {patient} », le nombre de résultats et les messages contenant une date ou un total.

## Points techniques à prévoir côté frontend

1. Introduire un fournisseur i18n avec catalogues `fr`, `en`, `ar`, et français par défaut.
2. Remplacer progressivement les littéraux par des clés, en commençant par `common`, `navigation`, `auth` et `status`.
3. Envoyer la préférence avec `Accept-Language` et enregistrer `locale` dans le profil.
4. Utiliser `Intl.DateTimeFormat` et `Intl.NumberFormat` pour dates, heures, pourcentages et monnaies.
5. Activer `dir="rtl"` pour l'arabe et vérifier la navigation latérale, les icônes directionnelles, tableaux et formulaires.
6. Ne jamais traduire les valeurs métier envoyées à l'API (`pending`, `confirmed`, etc.) ; traduire uniquement leur présentation.
