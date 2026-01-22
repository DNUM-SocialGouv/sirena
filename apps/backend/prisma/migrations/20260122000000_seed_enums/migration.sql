INSERT INTO "public"."AgeEnum" ("id","label") VALUES
  ('-18','Moins de 18 ans'),
  ('18-29','Entre 18 et 29 ans'),
  ('30-59','Entre 30 et 59 ans'),
  ('60-79','Entre 60 et 79 ans'),
  ('>= 80','80 ans et plus'),
  ('Inconnu','Inconnu')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."AutoriteTypeEnum" ("id","label") VALUES
  ('GENDARMERIE','Gendarmerie'),
  ('COMMISSARIAT','Commissariat'),
  ('TRIBUNAL','Tribunal')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."CiviliteEnum" ("id","label") VALUES
  ('M','Monsieur'),
  ('MME','Madame'),
  ('MX','autre'),
  ('NSP','Je ne souhaite pas répondre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."ConsequenceEnum" ("id","label") VALUES
  ('SANTE','Sur la santé (douleurs, blessures, stress, angoisse, troubles du sommeil, fatigue, mal-être...)'),
  ('DROITS','Sur les droits (impossible de porter plainte, d''être écouté, d''avoir un soutien...)'),
  ('BESOINS','Sur les besoins du quotidien (difficulté à manger, dormir, se laver, ou à recevoir l''aide dont elle a besoin...)'),
  ('SOCIAL','Sur la vie sociale ( isolement, rejet, mise à l''écart, difficulté à aller à l''école, au travail ou à participer à des activités...)'),
  ('AUCUNE','Aucune de ces conséquences')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."DemarchesEngageesEnum" ("id","label") VALUES
  ('CONTACT_RESPONSABLES','L''établissement ou le responsables des faits a été contacté'),
  ('CONTACT_ORGANISME','Démarches engagées auprès d''autres organismes'),
  ('PLAINTE','Une plainte a été déposée auprès des autorités judiciaires'),
  ('AUTRE','Autre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."EntiteTypeEnum" ("id","label") VALUES
  ('ARS','ARS'),
  ('DD','DD'),
  ('CD','CD')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."LienVictimeEnum" ("id","label") VALUES
  ('MEMBRE_FAMILLE','Membre de la famille'),
  ('PROCHE','Proche'),
  ('PROFESSIONNEL','Professionnel'),
  ('AUTRE','Autre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."LieuTypeEnum" ("id","label") VALUES
  ('DOMICILE','Domicile'),
  ('ETABLISSEMENT_SANTE','Etablissements de santé'),
  ('ETABLISSEMENT_PERSONNES_AGEES','Etablissements pour personnes âgées'),
  ('ETABLISSEMENT_HANDICAP','Etablissements pour personnes handicapées'),
  ('ETABLISSEMENT_SOCIAL','Etablissements sociaux'),
  ('AUTRES_ETABLISSEMENTS','Autres établissements'),
  ('TRAJET','Trajet')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."MaltraitanceTypeEnum" ("id","label") VALUES
  ('NEGLIGENCES','Manque de soins, de nourriture, d’hygiène ou de sécurité'),
  ('VIOLENCES','Insultes, coups, soin médical ou isolement forcé, autres violences'),
  ('MATERIELLE_FINANCIERE','Vol d’argent ou d’objets, confiscation'),
  ('SEXUELLE','Contact physique sans accord sur les parties intimes, attouchements forcés, exhibitionnisme, relation sexuelle forcée'),
  ('NON','Aucune de ces situations')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."MisEnCauseTypeEnum" ("id","label") VALUES
  ('MEMBRE_FAMILLE','Membre de la famille'),
  ('PROCHE','Proche (ami, voisin,...)'),
  ('AUTRE_PERSONNE_NON_PRO','Autre personne non professionnelle'),
  ('PROFESSIONNEL_SANTE','Professionnel de santé (médecin généraliste, spécialiste, dentiste, kinésithérapeute, orthophoniste, infirmier, aide-soignant...)'),
  ('PROFESSIONNEL_SOCIAL','Professionnel social (éducateur, assistant social...)'),
  ('NPJM','Un tuteur, curateur ou mandataire judiciaire'),
  ('AUTRE_PROFESSIONNEL','Autre professionnel'),
  ('AUTRE','Autre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."MotifEnum" ("id","label") VALUES
  ('ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/AUTRES','Autres'),
  ('ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/DEFAUT_DECLARATION_ACTIVITE','Défaut de déclaration d''activité'),
  ('ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES/NON_RESPECT_REGLES','Non respect des règles (hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, formations…)'),
  ('MEDICAMENTS/PROBLEMATIQUE_CIRCUIT_MEDICAMENT','Problématique de circuit du médicament'),
  ('MEDICAMENTS/STOCKAGE_MEDICAMENTS','Stockage des médicaments'),
  ('MEDICAMENTS/VENTE_MEDICAMENTS_INTERNET','Vente de médicaments sur internet'),
  ('FACTURATIONS_HONORAIRES/AUTRES','Autres'),
  ('FACTURATIONS_HONORAIRES/PROBLEME_HONORAIRES','Problème d''honoraires'),
  ('FACTURATIONS_HONORAIRES/PROBLEME_FACTURATION','Problème de facturation'),
  ('FACTURATIONS_HONORAIRES/HONORAIRES_PROFESSIONS_LIBERALES','Honoraires professions libérales'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/ACCESSIBILITE_LOCAUX','Accessibilité des locaux (aux personnes à mobilité réduite, parking…)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/ACCUEIL','Accueil'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/ADMISSION','Admission'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/AUTRES','Autres'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/CONFIGURATION_LOCAUX','Configuration des locaux (équipement sanitaire, superficie chambre, équipements divers)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/ENTRETIEN','Entretien (fenêtre endommagé, digicode non fonctionnel, …)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/HYGIENE','Hygiène (entretien, ménage…)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/GESTION_RESSOURCES_BIENS','La gestion des ressources ou des biens de la personne (dépôt, vols, perte…)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/EQUIPEMENTS_USAGE_PERSONNEL','Les équipements à usage personnel (télévision…)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/ABSENCE_LIEU_ACCUEIL_FAMILLE','Absence de lieu d''accueil pour la famille'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/SECURITE_LOCAUX','Sécurité des locaux (locaux mal sécurisé)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/SECURITE_PERSONNES','Sécurité des personnes (chute...)'),
  ('HOTELLERIE_LOCAUX_RESTAURATION/SERVICE_RESTAURATION','Service de restauration (horaires des repas, quantité servie, qualité des repas…)'),
  ('INFORMATIONS_DROITS_USAGERS/INFO_ACCOMPAGNEMENT_FIN_VIE','Informations sur l''accompagnement à la fin de vie (Loi Léonetti, demande évolutions législation)'),
  ('INFORMATIONS_DROITS_USAGERS/AUTRES','Autres'),
  ('INFORMATIONS_DROITS_USAGERS/DOSSIER_MEDICAL_NON_COMMUNIQUE','Dossier médical non communiqué'),
  ('INFORMATIONS_DROITS_USAGERS/INFO_DESIGNATION_PERSONNE_CONFIANCE','Informations sur la désignation d''une personne de confiance'),
  ('INFORMATIONS_DROITS_USAGERS/INFO_PATIENT_EVENEMENT','Informations du patient et résident suite à un événement (indésirable)'),
  ('INFORMATIONS_DROITS_USAGERS/INFO_PATIENT_PATHOLOGIE','Informations du patient sur sa pathologie, son opération, les risques encourus'),
  ('INFORMATIONS_DROITS_USAGERS/MODALITES_ANNONCE_DECES','Modalités d''annonce d''un décès'),
  ('INFORMATIONS_DROITS_USAGERS/RECUEIL_CONSENTEMENT','Recueil du consentement'),
  ('INFORMATIONS_DROITS_USAGERS/NON_RESPECT_SECRET_MEDICAL','Non-respect du secret médical'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/DISCRIMINATIONS','Discriminations'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/EXPOSITION_ENVIRONNEMENT_VIOLENT','Exposition à un environnement violent'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/NEGLIGENCES_ACTIVES','Négligences actives'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/NEGLIGENCES_PASSIVES','Négligences passives'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/PRIVATION_SOIN_BESOINS_FONDAMENTAUX','Privation de soin, notamment des besoins fondamentaux'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/PRIVATION_VIOLATION_DROITS_LIBERTES','Privation ou violation de droits, des libertés'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/VIOLENCES_MATERIELLES_FINANCIERES','Violences matérielles et financières'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/VIOLENCES_MEDICALES_MEDICAMENTEUSES','Violences médicales ou médicamenteuses'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/VIOLENCES_PHYSIQUES','Violences physiques'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/VIOLENCES_PSYCHIQUES_MORALES','Violences psychiques ou morales'),
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/VIOLENCES_SEXUELLES','Violences sexuelles'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/AUTRES','Autres'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/DEFAUT_ENCADREMENT_STAGE','Défaut d''encadrement en stage'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/REFUS_AIDE_PROFESSIONNEL','Refus d''aide de la part d''un professionnel'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/RELATIONS_FAMILLE_PROFESSIONNELS','Relations entre la famille/l''entourage et les professionnels'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/RELATIONS_USAGER_PROFESSIONNELS','Relations entre l''usager et les professionnels'),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/REFUS_CONSULTATION_PROFESSIONNEL_LIBERAL','Refus de consultation par un professionnel de santé libéral '),
  ('MAUVAISE_ATTITUDE_PROFESSIONNELS/REFUS_INTERVENTION_DOMICILE','Refus d''intervention au domicile (exemple : SOS médecins, IDEL ...)'),
  ('PRATIQUE_NON_CONVENTIONNELLE/DERIVES_SECTAIRES','Dérives sectaires'),
  ('PRATIQUE_NON_CONVENTIONNELLE/EXERCICE_ILLEGAL_USURPATION_TITRE','Exercice illegal / usurpation de titre (médecine ou autre profession)'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/CONFLIT_DIRECTION_ETABLISSEMENT','Conflit avec la direction d''établissement ou de service'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/CONFLIT_SOCIAL','Conflit social'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/MANQUE_PERSONNELS_ENCADRANT_INSTITUTS','Manque de personnels encadrant dans les instituts de formation (profession para-médical et sociale)'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/MANQUE_PERSONNEL_SOIGNANT','Manque de personnel soignant'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/ABSENCE_MEDEC','Absence de MEDEC'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/MANQUE_QUALIFICATION_PERSONNEL','Manque de qualification du personnel (diplôme...)'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/MANQUE_PERSONNEL_NON_SOIGNANT','Manque de personnel non soignant'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/PROBLEME_ACCOMPAGNEMENT_SUIVI_INDIVIDUEL','Problème d''accompagnement et/ou suivi individuel : projet de vie, suivi social, éducatif, administratif…'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/NON_RESPECT_PROGRAMMES_FORMATION','Non respect des programmes de formation'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/ABSENCE_ANIMATION','Absence d''animation'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/AUTRES','Autres'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/QUALITE_ANIMATIONS_LIEU_INTERVENTIONS','Qualité des animations au lieu d''interventions'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/PROBLEMATIQUE_FONCTIONNEMENT_ESSMS','Problématique de fonctionnement de l''ESSMS (règlement intérieur, …)'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_ENTRE_USAGERS','Violences entre usagers'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_USAGER_ENTOURAGE','Vilolences d''un usager envers son entourage'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/VIOLENCES_USAGER_PROFESSIONNEL','Violences d''un usager envers un professionnel'),
  ('QUALITE_ACCOMPAGNEMENT_SERVICE/DEFAUT_SURVEILLANCE','Défaut de surveillance (fugue / disparition inquiétante)'),
  ('QUALITE_SOINS/ABSENCE_INSUFFISANCE_SOINS_MEDICAUX','Absence ou insuffisance de soins médicaux'),
  ('QUALITE_SOINS/ABSENCE_INSUFFISANCE_SOINS_PARAMEDICAUX','Absence ou insuffisance de soins paramédicaux (repas, hygiène…)'),
  ('QUALITE_SOINS/ABSENCE_INSUFFISANCE_REEDUCATION','Absence ou insuffisance de la rééducation'),
  ('QUALITE_SOINS/AFFECTIONS_IATROGENES','Affections iatrogénes : infections liées aux soins, infections nosocomiales, événements liés à un produit de santé'),
  ('QUALITE_SOINS/AIDE_MEDICALE_URGENTE_SAMU','Aide médicale urgente (SAMU)'),
  ('QUALITE_SOINS/AUTRES','Autres'),
  ('QUALITE_SOINS/DEFAILLANCE_INCIDENT_SOINS_SURVEILLANCE','Défaillance ou incident lié aux soins ou à la surveillance (complications, incapacité, décès)'),
  ('QUALITE_SOINS/DELAIS_PRISE_EN_CHARGE','Délais de prise en charge'),
  ('QUALITE_SOINS/DIAGNOSTIC_PERTINENCE_EXAMENS','Diagnostic, pertinence des examens'),
  ('QUALITE_SOINS/ETAT_MATERIEL','Etat du matériel (en rapport avec les soins)'),
  ('QUALITE_SOINS/CONDITIONS_PRELEVEMENTS_BIOLOGIQUES','Les conditions de prélèvements biologiques'),
  ('QUALITE_SOINS/PRISE_EN_CHARGE_DOULEUR','Prise en charge de la douleur'),
  ('QUALITE_SOINS/RESULTATS_EXAMENS','Résultats d''examens'),
  ('QUALITE_SOINS/SOINS_PALLIATIFS','Soins palliatifs (absence ou défaut de plan de soin)'),
  ('QUALITE_SOINS/SOINS_POST_MORTEM','Soins post-mortem, conservation du corps'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/AUTRES','Autres'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/GARDE_PERMANENCE_SOINS_AMBULATOIRES','Garde et permanence des soins ambulatoires'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/MEDECIN_TRAITANT','Médecin traitant'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/SPECIALISTE','Spécialiste'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/RECHERCHE_SMR','Recherche de SMR'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/ETABLISSEMENT_MEDICO_SOCIAL_PA','Établissement médico-social PA'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/ETABLISSEMENT_MEDICO_SOCIAL_PH','Établissement médico-social PH'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/TRANSFERT_MANQUE_LIT','Transfert par manque de lit'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/DELAIS_ATTENTE_PLACE_ETABLISSEMENT','Délais d''attente pour une place au sein de l''établissement'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/RECHERCHE_SERVICE_ACCOMPAGNEMENT_DOMICILE_PA','Recherche d''un service d''accompagnement à domicile PA'),
  ('DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE/RECHERCHE_SERVICE_ACCOMPAGNEMENT_DOMICILE_PH','Recherche d''un service d''accompagnement à domicile PH'),
  ('PROBLEMES_ENVIRONNEMENTAUX/GESTION_DECHETS_DASRI','Problématiques ou gestion des déchets d''activités de soins à risques infectieux (DASRI)'),
  ('PROBLEMES_ENVIRONNEMENTAUX/SITUATION_EXCEPTIONNELLE','Situation exceptionnelle (exemple : canicule, innondations..)'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/CONDITIONS_CONDUITE_VEHICULE','Conditions de conduite du véhicule'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/CONDITIONS_PRISE_EN_CHARGE_PATIENT','Conditions de prise en charge du patient au début et à la fin (par exemple, délai d''attente, lieu de dépôt...)'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/DEFAUT_OFFRE','Défaut d''offre'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/DEFAUT_GARDE','Défaut de garde'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/NON_RESPECT_DISPOSITIONS_REGLEMENTAIRES','Non-respect des dispositions réglementaires en vigueur (absence de tenue professionnelle, véhicule nonconforme et hygiène, non-respect de l''obligation de présence d''un ambulancier dans la cellule sanitaire...)'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/TRANSFERT_ENTRE_ETABLISSEMENTS','Transfert entre établissements')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."MotifDeclaratifEnum" ("id","label") VALUES
  ('PROBLEME_COMPORTEMENTAL','Problème comportemental, relationnel ou de communication avec une personne'),
  ('PROBLEME_FACTURATION','Problème lié à la facturation ou aux honoraires'),
  ('PROBLEME_LOCAUX','Problème lié aux locaux ou la restauration'),
  ('NON_RESPECT_DROITS','Non-respect des droits des usagers dont défaut d’information (ex : non prise en compte de l''expression de besoin de la personne accompagnée, travail illégal...)'),
  ('PROBLEME_ORGANISATION','Problème d’organisation ou de fonctionnement de l’établissement ou du service (ex : Management, plannings, condition de travail...)'),
  ('PROBLEME_QUALITE_SOINS','Problème de qualité des soins médicaux ou paramédicaux (ex: soins et/ou interventions inadaptés, absents ou abusifs...)'),
  ('DIFFICULTES_ACCES_SOINS','Difficultés d''accès aux soins (établissement ou professionnel) (ex: manque de moyen humain...)'),
  ('AUTRE','Autre (ex: tatouage, chirurgie et/ou soins esthétiques...)')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."ReceptionTypeEnum" ("id","label") VALUES
  ('EMAIL','Courrier électronique'),
  ('COURRIER','Courrier postal'),
  ('FORMULAIRE','Formulaire'),
  ('PLATEFORME','Plateforme téléphonique'),
  ('TELEPHONE','Téléphone'),
  ('AUTRE','Autre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."RequeteClotureReasonEnum" ("id","label") VALUES
  ('MESURES_CORRECTIVES','Mesures correctives prises par l''établissement / le mis en cause'),
  ('ABSENCE_DE_RETOUR','Absence de retour/accord requérant'),
  ('HORS_COMPETENCE','Hors compétence'),
  ('MISSION_D_INSPECTION_ET_CONTROLE','Mission d’inspection et contrôle'),
  ('SANS_SUITE','Sans suite'),
  ('AUTRE','Autre')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."RequeteEtapeStatutEnum" ("id","label") VALUES
  ('EN_COURS','En cours'),
  ('A_FAIRE','À faire'),
  ('FAIT','Fait'),
  ('CLOTUREE','Clôturée')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."RequetePrioriteEnum" ("id","label","sortOrder") VALUES
  ('HAUTE','Haute',3),
  ('MOYENNE','Moyenne',2),
  ('BASSE','Basse',1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."RoleEnum" ("id","label") VALUES
  ('PENDING','En attente d''affectation'),
  ('READER','Agent en lecture'),
  ('WRITER','Agent en écriture'),
  ('NATIONAL_STEERING','Pilotage national'),
  ('ENTITY_ADMIN','Admin local'),
  ('SUPER_ADMIN','Super administrateur')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."StatutEnum" ("id","label") VALUES
  ('ACTIF','Actif'),
  ('INACTIF','Inactif'),
  ('NON_RENSEIGNE','Non renseigné')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."TransportTypeEnum" ("id","label") VALUES
  ('POMPIER','Sapeurs pompiers'),
  ('ASSU','Ambulance de secours et de soins d''urgence (ASSU)'),
  ('VSAV','Véhicule de secours et d''assistance aux victimes (VSAV)'),
  ('AMBULANCE','Ambulance'),
  ('VSL','Véhicule sanitaire léger'),
  ('TAXI','Chauffeur de taxi'),
  ('AUTRE','Autre type de transport')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "public"."MisEnCauseTypePrecisionEnum" ("id","label","misEnCauseTypeId") VALUES
  ('PARENT','Parent','MEMBRE_FAMILLE'),
  ('CONJOINT','Conjoint - conjointe','MEMBRE_FAMILLE'),
  ('ENFANT','Enfant','MEMBRE_FAMILLE'),
  ('AUTRE','Autre','MEMBRE_FAMILLE'),
  ('ENTOURAGE_SOCIAL','Entourage social (ami, voisin...)','PROCHE'),
  ('AUTRE','Autre','PROCHE'),
  ('AUTRE','Autre (patient ou résident, inconnu, escroc...)','AUTRE_PERSONNE_NON_PRO'),
  ('MEDECIN_GENERALISTE','Médecin généraliste','PROFESSIONNEL_SANTE'),
  ('MEDECIN_SPECIALISTE','Médecin spécialiste (cardio, uro, ...)','PROFESSIONNEL_SANTE'),
  ('MEDEC','MEDEC','PROFESSIONNEL_SANTE'),
  ('IDEC','IDEC','PROFESSIONNEL_SANTE'),
  ('IBODE','IBODE','PROFESSIONNEL_SANTE'),
  ('INFIRMIER','Infirmier','PROFESSIONNEL_SANTE'),
  ('SAGE_FEMME','Sage-femme','PROFESSIONNEL_SANTE'),
  ('CADRE_SANTE','Cadre de santé','PROFESSIONNEL_SANTE'),
  ('PHARMACIEN','Pharmacien','PROFESSIONNEL_SANTE'),
  ('AIDE_SOIGNANT','Aide soignant AS, AMP AES','PROFESSIONNEL_SANTE'),
  ('ASH','Agent de services hospitaliers ASH','PROFESSIONNEL_SANTE'),
  ('BIOLOGISTE','Biologiste','PROFESSIONNEL_SANTE'),
  ('AMBULANCIER','Ambulancier','PROFESSIONNEL_SANTE'),
  ('BRANCARDIER','Brancardier','PROFESSIONNEL_SANTE'),
  ('AUTRE','Autre','PROFESSIONNEL_SANTE'),
  ('ASSISTANT_SOCIAL','Assistant social','PROFESSIONNEL_SOCIAL'),
  ('INTERVENANT_SOCIAL','Intervenant social','PROFESSIONNEL_SOCIAL'),
  ('EDUCATEUR_SPECIALISE','Educateur spécialisé','PROFESSIONNEL_SOCIAL'),
  ('ANIMATEUR','Animateur','PROFESSIONNEL_SOCIAL'),
  ('CESF','Conseillers en économie sociale et familial (CESF)','PROFESSIONNEL_SOCIAL'),
  ('MANDATAIRE','Mandataire','PROFESSIONNEL_SOCIAL'),
  ('AUTRE','Autre','PROFESSIONNEL_SOCIAL'),
  ('RESPONSABLE_ETABLISSEMENT','Responsable d''établissement','AUTRE_PROFESSIONNEL'),
  ('AGENT_ACCUEIL_ADMIN','Agent d''accueil ou administratif','AUTRE_PROFESSIONNEL'),
  ('CHEF_SERVICE','Chef de service','AUTRE_PROFESSIONNEL'),
  ('TATOUEUR','Tatoueur','AUTRE_PROFESSIONNEL'),
  ('PSYCHANALYSTE','Psychanalyste','AUTRE_PROFESSIONNEL'),
  ('PSYCHOLOGUE','Psychologue','AUTRE_PROFESSIONNEL'),
  ('PSYCHOTHERAPEUTE','Psychothérapeute','AUTRE_PROFESSIONNEL'),
  ('DIETETICIEN','Diététicien','AUTRE_PROFESSIONNEL'),
  ('OSTEOPATHE','Ostéopathe','AUTRE_PROFESSIONNEL'),
  ('CHIROPRACTEUR','Chiropracteur','AUTRE_PROFESSIONNEL'),
  ('ORTHOPHONISTE','Orthophoniste','AUTRE_PROFESSIONNEL'),
  ('AUDIOPROTHESISTE','Audioprothesiste','AUTRE_PROFESSIONNEL'),
  ('EPITHESISTE','Epithesiste','AUTRE_PROFESSIONNEL'),
  ('MANIPULATEUR_RADIO','Manipulateur radio','AUTRE_PROFESSIONNEL'),
  ('OCULAIRE_OPTIQUE','Oculariste, opticien, lunetier, orthoptiste','AUTRE_PROFESSIONNEL'),
  ('ORTHOPEDISTE','Orthopediste','AUTRE_PROFESSIONNEL'),
  ('ORTHESISTE','Orthesiste, orthoprothesistes, podo-orthésistes','AUTRE_PROFESSIONNEL'),
  ('PSYCHOMOTRICIEN','Psychomotricien','AUTRE_PROFESSIONNEL'),
  ('TECHNICIEN_LABO','Techniciens de laboratoire','AUTRE_PROFESSIONNEL'),
  ('ACUPUNCTEUR','Acupuncteur','AUTRE_PROFESSIONNEL'),
  ('EQUIPE_MOBILE','Équipe mobile','AUTRE_PROFESSIONNEL'),
  ('SAPEUR_POMPIER','Sapeur pompier','AUTRE_PROFESSIONNEL'),
  ('MEDECINE_NON_CONVENTIONNELLE','Médecine non conventionnelle (naturopathe...)','AUTRE_PROFESSIONNEL'),
  ('ESTHETICIEN','Esthéticien','AUTRE_PROFESSIONNEL'),
  ('AUTRE','Autre','AUTRE_PROFESSIONNEL'),
  ('PROF_SANTE','Un professionnel de santé (médecin généraliste, spécialiste, dentiste, kinésithérapeute, orthophoniste, infirmier, aide-soignant...)','PROFESSIONNEL_SANTE'),
  ('TRAVAILLEUR_SOCIAL','Travailleur social (éducateur, assistant social...)','PROFESSIONNEL_SANTE'),
  ('PROF_SOIN','Un professionnel du soin (coiffeur, esthéticienne, naturopathe, ...)','PROFESSIONNEL_SANTE'),
  ('RESPONSABLE','Responsable (directeur, cadre de santé...)','PROFESSIONNEL_SANTE'),
  ('MJPM','Mandataire judiciaire à la protection des majeurs (curateur, tuteur...)','PROFESSIONNEL_SANTE'),
  ('PROF_LIBERAL','Intervention d''un professionnel libéral ou service (SAMU, médecin)','PROFESSIONNEL_SANTE'),
  ('HAD','Hospitalisation à domicile','PROFESSIONNEL_SANTE'),
  ('SSAD','Services de soins infirmiers ou d''aide à domicile (SAAD, SSIAD, SPASAD)','PROFESSIONNEL_SANTE'),
  ('SAMSAH','SAMSAH','PROFESSIONNEL_SANTE'),
  ('SAEMO','SAEMO (services d''action éducative en milieu ouvert)','PROFESSIONNEL_SANTE'),
  ('SESSAD','Service d''éducation spéciale et de soins','PROFESSIONNEL_SANTE'),
  ('SAED','SAED (Services d''action éducative à domicile)','PROFESSIONNEL_SANTE'),
  ('SPST','SPST','PROFESSIONNEL_SANTE'),
  ('AIDE_MENAGERE','Service d''aide ménagère','PROFESSIONNEL_SANTE'),
  ('REPAS','Service de repas','PROFESSIONNEL_SANTE'),
  ('TRAITEMENT','Traitements spécialisés','PROFESSIONNEL_SANTE'),
  ('SAADF','Service d''Aide et d''Accompagnement à Domicile aux Familles (SAADF)','PROFESSIONNEL_SANTE'),
  ('SSIAD','Service de Soins Infirmier à Domicile (SSIAD)','PROFESSIONNEL_SANTE'),
  ('SAAD','Service d''Aide et d''Accompagnement à Domicile (SAAD)','PROFESSIONNEL_SANTE')
ON CONFLICT ("misEnCauseTypeId", "id") DO NOTHING;
