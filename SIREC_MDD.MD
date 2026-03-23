# Modèle de données SIREC

  ---
  Entité centrale

  sire_reclamation_data — La réclamation (table principale)
  - Infos administratives : r_recept_date, etat, domaine, description, numero_sirce
  - Plaignant : plaignant_nom/prenom/sexe/adresse/mail/tel, plaignant_anonyme, plaignant_type
  - Victime : victime_nom/prenom/sexe/age/adresse, victime_non_identifiee
  - Traitement : type_traitement, date_traitement, type_cloture, date_cloture
  - Relations : finess, rpps, departement, service_gestionnaire

  ---
  Acteurs liés à la réclamation

  ┌─────────────────────────┬───────────────────────────────────────────────────────┐
  │          Table          │                         Rôle                          │
  ├─────────────────────────┼───────────────────────────────────────────────────────┤
  │ sire_misencause_data    │ Mis en cause (type, label, adresse, service concerné) │
  ├─────────────────────────┼───────────────────────────────────────────────────────┤
  │ sire_provenances_data   │ Provenances d'une réclamation                         │
  ├─────────────────────────┼───────────────────────────────────────────────────────┤
  │ sire_main_courante_data │ Journal des actions (main courante)                   │
  ├─────────────────────────┼───────────────────────────────────────────────────────┤
  │ sire_trace_data         │ Traçabilité des modifications                         │
  └─────────────────────────┴───────────────────────────────────────────────────────┘

  ---
  Référentiels

  ┌───────────────────────┬───────────────────────────────────┐
  │         Table         │              Contenu              │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_finess_data      │ Établissements FINESS             │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_rpps_data        │ Professionnels de santé (RPPS)    │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_igas_data        │ Arborescence IGAS                 │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_dico_data        │ Dictionnaires / listes de valeurs │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_villes_data      │ Villes / codes postaux            │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_departement_data │ Départements                      │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_user_data        │ Utilisateurs                      │
  ├───────────────────────┼───────────────────────────────────┤
  │ sire_parametrage_data │ Paramétrage général               │
  └───────────────────────┴───────────────────────────────────┘

  ---
  Tables de liaison (many-to-many)

  - sire_reclamation_dico_motifs_declares_data → motifs déclarés d'une réclamation
  - sire_reclamation_dico_type_traitement_data → types de traitement d'une réclamation
  - sire_misencause_dico_type_traitement_data → types de traitement d'un mis en cause
  - sire_mc_igas_data → lien main courante / IGAS
  - sire_reclamation_file_data, sire_modele_file_data, sire_import_file_data → fichiers joints

  ---
  Fichiers & exports

  - sire_file_data — Fichiers (nom, hash, type, taille)
  - sire_sys_export_data — Exports en cours/terminés




## Entité centrale

### `sire_reclamation_data` — La réclamation (table principale)

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `id_owner` | int unsigned | Propriétaire |
| `sys_creation_date` | datetime | Date de création |
| `sys_last_mod_date` | datetime | Date de dernière modification |
| `sys_last_mod_user` | int unsigned | Dernier utilisateur modificateur |
| `r_recept_date` | date | Date de réception |
| `description` | text | Description de la réclamation |
| `domaine` | int unsigned | Domaine |
| `reception` | int unsigned | Mode de réception |
| `dest` | int unsigned | Destinataire |
| `saisine` | int unsigned | Type de saisine |
| `dest_secondaire` | varchar(255) | Destinataire secondaire |
| `dest_primaire` | varchar(255) | Destinataire primaire |
| `etat` | int unsigned | État de la réclamation |
| `numero_sirce` | varchar(255) | Numéro SIRCE |
| `ref_sirce` | int | Référence SIRCE |
| `num_sign_assoc` | varchar(50) | Numéro de signalement associé |
| `signalement` | int | Signalement |
| `prioritaire` | int | Réclamation prioritaire |
| `prioritaire_precisez` | varchar(255) | Précision priorité |
| `calculEtat` | int | État calculé |
| `anteriotite` | int unsigned | Antériorité |
| **Plaignant** | | |
| `plaignant` | int unsigned | Identifiant plaignant |
| `plaignant_anonyme` | int | Plaignant anonyme |
| `plaignant_est_anonyme` | int | Plaignant est anonyme |
| `plaignant_connu` | int | Plaignant connu |
| `plaignant_type` | int unsigned | Type de plaignant |
| `plaignant_nom` | varchar(255) | Nom du plaignant |
| `plaignant_prenom` | varchar(255) | Prénom du plaignant |
| `plaignant_sexe` | int unsigned | Sexe du plaignant |
| `plaignant_rs` | varchar(255) | Raison sociale plaignant |
| `plaignant_adresse` | varchar(255) | Adresse du plaignant |
| `plaignant_adresse_complement` | varchar(255) | Complément d'adresse |
| `plaignant_mail` | varchar(255) | Email du plaignant |
| `plaignant_tel` | varchar(255) | Téléphone du plaignant |
| `plaignant_loc` | int unsigned | Localisation plaignant |
| `requerant_adresse_complete` | varchar(255) | Adresse complète requérant |
| `requerant_adresse` | varchar(255) | Adresse requérant |
| `requerant_cp` | varchar(255) | Code postal requérant |
| `requerant_ville` | varchar(255) | Ville requérant |
| **Victime** | | |
| `victime_non_identifiee` | int | Victime non identifiée |
| `victime_nom` | varchar(255) | Nom de la victime |
| `victime_prenom` | varchar(255) | Prénom de la victime |
| `victime_sexe` | int unsigned | Sexe de la victime |
| `victime_age` | int | Âge de la victime |
| `victime_adresse` | varchar(255) | Adresse de la victime |
| `victime_adresse_complement` | varchar(255) | Complément d'adresse victime |
| `victime_mail` | varchar(255) | Email de la victime |
| `victime_tel` | varchar(255) | Téléphone de la victime |
| `victime_lien_plaignant` | int unsigned | Lien victime/plaignant |
| `victime_loc` | int unsigned | Localisation victime |
| `usager_adresse_complete` | varchar(255) | Adresse complète usager |
| `usager_adresse` | varchar(255) | Adresse usager |
| `usager_cp` | varchar(255) | Code postal usager |
| `usager_ville` | varchar(255) | Ville usager |
| **Représentant / Mandataire** | | |
| `nom_representant` | varchar(255) | Nom du représentant |
| `prenom_representant` | varchar(255) | Prénom du représentant |
| `lien_plai_autre` | varchar(255) | Lien plaignant autre |
| `mandataire_judiciaire` | int | Mandataire judiciaire |
| `mandataire_precisez` | int unsigned | Précision mandataire |
| **Traitement** | | |
| `type_traitement` | int unsigned | Type de traitement |
| `type_traitement_prec` | varchar(255) | Précision type de traitement |
| `date_traitement` | date | Date de traitement |
| `mesures_prises` | int unsigned | Mesures prises |
| `mesures_initiative` | int unsigned | Mesures à l'initiative |
| `mesures_precision` | varchar(255) | Précision des mesures |
| `ei_avere` | int unsigned | EI avéré |
| `niv_competence_reclam` | int unsigned | Niveau de compétence |
| `prec_niv_comp` | text | Précision niveau compétence |
| `type_cloture` | int unsigned | Type de clôture |
| `motif_cloture` | text | Motif de clôture |
| `date_cloture` | date | Date de clôture |
| `cloture_affectation` | int | Clôture affectation |
| `date_commission` | date | Date de commission |
| **Courrier / AR** | | |
| `courrier_signal` | int unsigned | Courrier signalement |
| `accuser_reception` | int unsigned | Accusé de réception |
| `accuser_reception_precision` | varchar(255) | Précision AR |
| `date_envoi_ar` | date | Date d'envoi AR |
| `reponse_plaignant` | int unsigned | Réponse au plaignant |
| `date_rep_plaignant` | date | Date réponse plaignant |
| `reponse_plaignant_precision` | varchar(255) | Précision réponse plaignant |
| `date_rep_provenance1` | date | Date réponse provenance 1 |
| `date_rep_provenance2` | date | Date réponse provenance 2 |
| `date_rep_provenance3` | date | Date réponse provenance 3 |
| `reponse_attendue` | int unsigned | Réponse attendue |
| `date_signalement` | date | Date de signalement |
| **Relations** | | |
| `finess` | int unsigned | Établissement FINESS |
| `rpps` | int unsigned | Professionnel RPPS |
| `departement` | int unsigned | Département |
| `service_gestionnaire` | int unsigned | Service gestionnaire |
| `service_recepteur_niv1` | int unsigned | Service récepteur niveau 1 |
| `service_mc1..5` | int unsigned | Services mis en cause 1 à 5 |
| `a_renseigner_mc1..5` | int | À renseigner MC 1 à 5 |
| `institution_part` | varchar(255) | Institution partenaire |
| `institution_label` | varchar(255) | Label institution |
| `motifs_declares` | int unsigned | Motifs déclarés |
| **Autres** | | |
| `observation` | text | Observation |
| `autres_mc` | varchar(255) | Autres mis en cause |
| `autres_mc_type` | int unsigned | Type autres mis en cause |
| `autres_mc_adresse` | varchar(255) | Adresse autres mis en cause |
| `adresse_ban_mc_autre` | varchar(255) | Adresse BAN MC autre |
| `sans_mc` | int | Sans mis en cause |
| `date_recep_gest` | date | Date réception gestionnaire |
| `date_ecriture` | date | Date d'écriture |
| `preciser_statut` | varchar(255) | Préciser statut |
| `partagedroit` | varchar(255) | Droits de partage |
| `ecrituredroit` | varchar(255) | Droits d'écriture |
| `demat_number` | varchar(255) | Numéro dématérialisé |
| `id_data_voo3` | int | Identifiant Voozanoo 3 |

---

## Acteurs liés à la réclamation

### `sire_misencause_data` — Mis en cause

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `identifiant` | int unsigned | Identifiant |
| `type` | int unsigned | Type de mis en cause |
| `label` | varchar(255) | Libellé |
| `adresse` | varchar(255) | Adresse |
| `service_concerne` | int unsigned | Service concerné |
| `public_concerne` | int unsigned | Public concerné |
| `type_traitement` | int unsigned | Type de traitement |
| `validate` | int unsigned | Validé |
| `autres_mc_type` | int unsigned | Type autres MC |
| `libelle_mc` | varchar(255) | Libellé MC |
| `autres_mc` | varchar(255) | Autres MC |
| `partagedroit` | varchar(255) | Droits de partage |
| `ecrituredroit` | varchar(255) | Droits d'écriture |
| `id_reclamation` | int unsigned | FK → réclamation |

### `sire_provenances_data` — Provenances

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `id_reclamation` | int unsigned | FK → réclamation |
| `id_provenance` | int | Identifiant provenance |
| `date_signalement` | date | Date de signalement |
| `reponse_attendue` | int unsigned | Réponse attendue |

### `sire_main_courante_data` — Main courante

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `id_mc` | int unsigned | Identifiant MC |
| `type_action1/2/3` | int unsigned | Types d'action |
| `date_action` | date | Date de l'action |
| `commentaire` | text | Commentaire |
| `categorie_tmp` | varchar(255) | Catégorie temporaire |
| `infos_main_courante` | varchar(255) | Informations MC |
| `id_reclamation` | int unsigned | FK → réclamation |

### `sire_trace_data` — Traçabilité

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `qui` | varchar(255) | Auteur de l'action |
| `id_recl` | int | FK → réclamation |
| `quoi` | int unsigned | Action effectuée |
| `quand_date` | date | Date |
| `quand_heure` | varchar(8) | Heure |
| `service` | varchar(255) | Service |

---

## Référentiels

### `sire_finess_data` — Établissements FINESS

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `nofinesset` | varchar(9) | N° FINESS établissement |
| `nofinessej` | varchar(9) | N° FINESS entité juridique |
| `rs` | varchar(50) | Raison sociale |
| `rslongue` | varchar(100) | Raison sociale longue |
| `categetab` | varchar(3) | Catégorie établissement |
| `libcategetab` | varchar(100) | Libellé catégorie |
| `categagretab` | varchar(4) | Catégorie agrégée |
| `departement` | varchar(2) | Département |
| `codepostal` | varchar(5) | Code postal |
| `commune` | varchar(3) | Code commune |
| `libcommune` | varchar(50) | Libellé commune |
| `telephone` | varchar(10) | Téléphone |
| `datecrea` | date | Date de création |
| `datefermeture` | date | Date de fermeture |
| `search` | varchar(255) | Champ de recherche |

### `sire_rpps_data` — Professionnels de santé (RPPS)

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `rpps` | varchar(255) | Numéro RPPS |
| `nom` | varchar(255) | Nom |
| `prenom` | varchar(255) | Prénom |
| `civilite` | varchar(255) | Civilité |
| `intitule` | varchar(255) | Intitulé profession |
| `libelle_prof` | varchar(255) | Libellé profession |
| `departement` | varchar(255) | Département |
| `adresse` | varchar(255) | Adresse |
| `code_postal` | varchar(255) | Code postal |
| `telephone` | varchar(255) | Téléphone |
| `email` | varchar(255) | Email |
| `num_finess_site` | varchar(255) | N° FINESS site |
| `actif` | varchar(255) | Actif |

### `sire_igas_data` — Arborescence IGAS

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `libelle` | varchar(255) | Libellé |
| `niveau` | int | Niveau hiérarchique |
| `parent` | int | Nœud parent |
| `affichage` | int | Affiché |

### `sire_dico_data` — Dictionnaires / listes de valeurs

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `dico_name` | varchar(100) | Nom du dictionnaire |
| `label` | varchar(255) | Libellé long |
| `short_label` | varchar(30) | Libellé court |
| `code` | varchar(50) | Code |
| `position` | int | Position d'affichage |
| `archived` | int | Archivé |

### `sire_user_data` — Utilisateurs

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `username` | varchar(50) | Nom d'utilisateur |
| `firstname` | varchar(50) | Prénom |
| `lastname` | varchar(50) | Nom |
| `email` | varchar(200) | Email |
| `status` | int unsigned | Statut |
| `id_group` | int | Groupe |
| `rpps` | varchar(11) | Numéro RPPS |
| `expire_date` | date | Date d'expiration |
| `pwd_last_mod_date` | date | Date dernier changement de mot de passe |
| `sys_last_connection_date` | date | Dernière connexion |
| `sys_last_mfa_date` | date | Dernière authentification MFA |

### `sire_parametrage_data` — Paramétrage général

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `nb_jours_alerte1/2/4` | int | Délais d'alerte (jours) |
| `adresse_mail_notification` | varchar(255) | Email de notification |
| `id_departement` | int unsigned | Département |
| `ars` | int unsigned | ARS |

### `sire_departement_data` — Départements

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `departement` | int unsigned | Code département |
| `id_parametrage` | int unsigned | FK → paramétrage |

### `sire_villes_data` — Villes

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `nom` | varchar(255) | Nom de la ville |
| `cp` | varchar(255) | Code postal |

---

## Tables de liaison (many-to-many)

| Table | Relation |
|---|---|
| `sire_reclamation_dico_motifs_declares_data` | Réclamation ↔ Motifs déclarés (dico) |
| `sire_reclamation_dico_type_traitement_data` | Réclamation ↔ Types de traitement (dico) |
| `sire_misencause_dico_type_traitement_data` | Mis en cause ↔ Types de traitement (dico) |
| `sire_mc_igas_data` | Main courante ↔ IGAS (avec institution, niveau, type) |
| `sire_reclamation_file_data` | Réclamation ↔ Fichiers (avec FK mis en cause) |
| `sire_modele_file_data` | Modèle de document ↔ Fichiers |
| `sire_import_file_data` | Import ↔ Fichiers |

---

## Fichiers & exports

### `sire_file_data` — Fichiers

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `original_name` | varchar(128) | Nom original |
| `generated_name` | varchar(32) | Nom généré |
| `ext` | varchar(8) | Extension |
| `content_type` | varchar(100) | Type MIME |
| `size` | int | Taille |
| `hash` | varchar(32) | Hash du fichier |
| `status` | int | Statut |
| `file_type` | varchar(50) | Type de fichier |
| `type_doc` | varchar(255) | Type de document |
| `id_storage` | int unsigned | FK → stockage |
| `path` | varchar(250) | Chemin |

### `sire_sys_export_data` — Exports

| Colonne | Type | Description |
|---|---|---|
| `id_data` | int unsigned | Clé primaire |
| `id_resource` | varchar(255) | Ressource exportée |
| `total_rows` | int | Nombre total de lignes |
| `current_packet_number` | int | Paquet courant |
| `total_packets_number` | int | Nombre total de paquets |
| `status` | int | Statut |
| `file_name` | varchar(130) | Nom du fichier |
| `file_ext` | varchar(10) | Extension |
| `file_path` | varchar(255) | Chemin |
