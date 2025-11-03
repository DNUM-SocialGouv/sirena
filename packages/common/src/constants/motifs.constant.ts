export const MOTIFS_HIERARCHICAL_DATA = [
  {
    label: "Activités d'esthétique non réglementées",
    value: 'ACTIVITES_ESTHETIQUE_NON_REGLEMENTEES',
    children: [
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: "Défaut de déclaration d'activité",
        value: 'DEFAUT_DECLARATION_ACTIVITE',
      },
      {
        label:
          'Non respect des règles (hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, formations…)',
        value: 'NON_RESPECT_REGLES',
      },
    ],
  },
  {
    label: 'Médicaments',
    value: 'MEDICAMENTS',
    children: [
      {
        label: 'Problématique de circuit du médicament',
        value: 'PROBLEMATIQUE_CIRCUIT_MEDICAMENT',
      },
      {
        label: 'Stockage des médicaments',
        value: 'STOCKAGE_MEDICAMENTS',
      },
      {
        label: 'Vente de médicaments sur internet',
        value: 'VENTE_MEDICAMENTS_INTERNET',
      },
    ],
  },
  {
    label: 'Facturations et honoraires',
    value: 'FACTURATIONS_HONORAIRES',
    children: [
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: "Problème d'honoraires",
        value: 'PROBLEME_HONORAIRES',
      },
      {
        label: 'Problème de facturation',
        value: 'PROBLEME_FACTURATION',
      },
      {
        label: 'Honoraires professions libérales',
        value: 'HONORAIRES_PROFESSIONS_LIBERALES',
      },
    ],
  },
  {
    label: 'Hôtellerie locaux restauration',
    value: 'HOTELLERIE_LOCAUX_RESTAURATION',
    children: [
      {
        label: 'Accessibilité des locaux (aux personnes à mobilité réduite, parking…)',
        value: 'ACCESSIBILITE_LOCAUX',
      },
      {
        label: 'Accueil',
        value: 'ACCUEIL',
      },
      {
        label: 'Admission',
        value: 'ADMISSION',
      },
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: 'Configuration des locaux (équipement sanitaire, superficie chambre, équipements divers)',
        value: 'CONFIGURATION_LOCAUX',
      },
      {
        label: 'Entretien (fenêtre endommagé, digicode non fonctionnel, …)',
        value: 'ENTRETIEN',
      },
      {
        label: 'Hygiène (entretien, ménage…)',
        value: 'HYGIENE',
      },
      {
        label: 'La gestion des ressources ou des biens de la personne (dépôt, vols, perte…)',
        value: 'GESTION_RESSOURCES_BIENS',
      },
      {
        label: 'Les équipements à usage personnel (télévision…)',
        value: 'EQUIPEMENTS_USAGE_PERSONNEL',
      },
      {
        label: "Absence de lieu d'accueil pour la famille",
        value: 'ABSENCE_LIEU_ACCUEIL_FAMILLE',
      },
      {
        label: 'Sécurité des locaux (locaux mal sécurisé)',
        value: 'SECURITE_LOCAUX',
      },
      {
        label: 'Sécurité des personnes (chute...)',
        value: 'SECURITE_PERSONNES',
      },
      {
        label: 'Service de restauration (horaires des repas, quantité servie, qualité des repas…)',
        value: 'SERVICE_RESTAURATION',
      },
    ],
  },
  {
    label: 'Informations et droits des usagers',
    value: 'INFORMATIONS_DROITS_USAGERS',
    children: [
      {
        label: "Informations sur l'accompagnement à la fin de vie (Loi Léonetti, demande évolutions législation)",
        value: 'INFO_ACCOMPAGNEMENT_FIN_VIE',
      },
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: 'Dossier médical non communiqué',
        value: 'DOSSIER_MEDICAL_NON_COMMUNIQUE',
      },
      {
        label: "Informations sur la désignation d'une personne de confiance",
        value: 'INFO_DESIGNATION_PERSONNE_CONFIANCE',
      },
      {
        label: 'Informations du patient et résident suite à un événement (indésirable)',
        value: 'INFO_PATIENT_EVENEMENT',
      },
      {
        label: 'Informations du patient sur sa pathologie, son opération, les risques encourus',
        value: 'INFO_PATIENT_PATHOLOGIE',
      },
      {
        label: "Modalités d'annonce d'un décès",
        value: 'MODALITES_ANNONCE_DECES',
      },
      {
        label: 'Recueil du consentement',
        value: 'RECUEIL_CONSENTEMENT',
      },
      {
        label: 'Non-respect du secret médical',
        value: 'NON_RESPECT_SECRET_MEDICAL',
      },
    ],
  },
  {
    label: 'Maltraitance professionnels ou entourage',
    value: 'MALTRAITANCE_PROFESSIONNELS_ENTOURAGE',
    children: [
      {
        label: 'Discriminations',
        value: 'DISCRIMINATIONS',
      },
      {
        label: 'Exposition à un environnement violent',
        value: 'EXPOSITION_ENVIRONNEMENT_VIOLENT',
      },
      {
        label: 'Négligences actives',
        value: 'NEGLIGENCES_ACTIVES',
      },
      {
        label: 'Négligences passives',
        value: 'NEGLIGENCES_PASSIVES',
      },
      {
        label: 'Privation de soin, notamment des besoins fondamentaux',
        value: 'PRIVATION_SOIN_BESOINS_FONDAMENTAUX',
      },
      {
        label: 'Privation ou violation de droits, des libertés',
        value: 'PRIVATION_VIOLATION_DROITS_LIBERTES',
      },
      {
        label: 'Violences matérielles et financières',
        value: 'VIOLENCES_MATERIELLES_FINANCIERES',
      },
      {
        label: 'Violences médicales ou médicamenteuses',
        value: 'VIOLENCES_MEDICALES_MEDICAMENTEUSES',
      },
      {
        label: 'Violences physiques',
        value: 'VIOLENCES_PHYSIQUES',
      },
      {
        label: 'Violences psychiques ou morales',
        value: 'VIOLENCES_PSYCHIQUES_MORALES',
      },
      {
        label: 'Violences sexuelles',
        value: 'VIOLENCES_SEXUELLES',
      },
    ],
  },
  {
    label: 'Mauvaise attitude des professionnels',
    value: 'MAUVAISE_ATTITUDE_PROFESSIONNELS',
    children: [
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: "Défaut d'encadrement en stage",
        value: 'DEFAUT_ENCADREMENT_STAGE',
      },
      {
        label: "Refus d'aide de la part d'un professionnel",
        value: 'REFUS_AIDE_PROFESSIONNEL',
      },
      {
        label: "Relations entre la famille/l'entourage et les professionnels",
        value: 'RELATIONS_FAMILLE_PROFESSIONNELS',
      },
      {
        label: "Relations entre l'usager et les professionnels",
        value: 'RELATIONS_USAGER_PROFESSIONNELS',
      },
      {
        label: 'Refus de consultation par un professionnel de santé libéral ',
        value: 'REFUS_CONSULTATION_PROFESSIONNEL_LIBERAL',
      },
      {
        label: "Refus d'intervention au domicile (exemple : SOS médecins, IDEL ...)",
        value: 'REFUS_INTERVENTION_DOMICILE',
      },
    ],
  },
  {
    label: 'Pratique non conventionnelle',
    value: 'PRATIQUE_NON_CONVENTIONNELLE',
    children: [
      {
        label: 'Dérives sectaires',
        value: 'DERIVES_SECTAIRES',
      },
      {
        label: 'Exercice illegal / usurpation de titre (médecine ou autre profession)',
        value: 'EXERCICE_ILLEGAL_USURPATION_TITRE',
      },
    ],
  },
  {
    label: "Problèmes d'organisation ou de ressources humaines",
    value: 'PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES',
    children: [
      {
        label: "Conflit avec la direction d'établissement ou de service",
        value: 'CONFLIT_DIRECTION_ETABLISSEMENT',
      },
      {
        label: 'Conflit social',
        value: 'CONFLIT_SOCIAL',
      },
      {
        label: 'Manque de personnels encadrant dans les instituts de formation (profession para-médical et sociale)',
        value: 'MANQUE_PERSONNELS_ENCADRANT_INSTITUTS',
      },
      {
        label: 'Manque de personnel soignant',
        value: 'MANQUE_PERSONNEL_SOIGNANT',
      },
      {
        label: 'Absence de MEDEC',
        value: 'ABSENCE_MEDEC',
      },
      {
        label: 'Manque de qualification du personnel (diplôme...)',
        value: 'MANQUE_QUALIFICATION_PERSONNEL',
      },
      {
        label: 'Manque de personnel non soignant',
        value: 'MANQUE_PERSONNEL_NON_SOIGNANT',
      },
    ],
  },
  {
    label: "Qualité de l'accompagnement ou du service",
    value: 'QUALITE_ACCOMPAGNEMENT_SERVICE',
    children: [
      {
        label:
          "Problème d'accompagnement et/ou suivi individuel : projet de vie, suivi social, éducatif, administratif…",
        value: 'PROBLEME_ACCOMPAGNEMENT_SUIVI_INDIVIDUEL',
      },
      {
        label: 'Non respect des programmes de formation',
        value: 'NON_RESPECT_PROGRAMMES_FORMATION',
      },
      {
        label: "Absence d'animation",
        value: 'ABSENCE_ANIMATION',
      },
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: "Qualité des animations au lieu d'interventions",
        value: 'QUALITE_ANIMATIONS_LIEU_INTERVENTIONS',
      },
      {
        label: "Problématique de fonctionnement de l'ESSMS (règlement intérieur, …)",
        value: 'PROBLEMATIQUE_FONCTIONNEMENT_ESSMS',
      },
      {
        label: 'Violences entre usagers',
        value: 'VIOLENCES_ENTRE_USAGERS',
      },
      {
        label: "Vilolences d'un usager envers son entourage",
        value: 'VIOLENCES_USAGER_ENTOURAGE',
      },
      {
        label: "Violences d'un usager envers un professionnel",
        value: 'VIOLENCES_USAGER_PROFESSIONNEL',
      },
      {
        label: 'Défaut de surveillance (fugue / disparition inquiétante)',
        value: 'DEFAUT_SURVEILLANCE',
      },
    ],
  },
  {
    label: 'Qualité des soins',
    value: 'QUALITE_SOINS',
    children: [
      {
        label: 'Absence ou insuffisance de soins médicaux',
        value: 'ABSENCE_INSUFFISANCE_SOINS_MEDICAUX',
      },
      {
        label: 'Absence ou insuffisance de soins paramédicaux (repas, hygiène…)',
        value: 'ABSENCE_INSUFFISANCE_SOINS_PARAMEDICAUX',
      },
      {
        label: 'Absence ou insuffisance de la rééducation',
        value: 'ABSENCE_INSUFFISANCE_REEDUCATION',
      },
      {
        label:
          'Affections iatrogénes : infections liées aux soins, infections nosocomiales, événements liés à un produit de santé',
        value: 'AFFECTIONS_IATROGENES',
      },
      {
        label: 'Aide médicale urgente (SAMU)',
        value: 'AIDE_MEDICALE_URGENTE_SAMU',
      },
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: 'Défaillance ou incident lié aux soins ou à la surveillance (complications, incapacité, décès)',
        value: 'DEFAILLANCE_INCIDENT_SOINS_SURVEILLANCE',
      },
      {
        label: 'Délais de prise en charge',
        value: 'DELAIS_PRISE_EN_CHARGE',
      },
      {
        label: 'Diagnostic, pertinence des examens',
        value: 'DIAGNOSTIC_PERTINENCE_EXAMENS',
      },
      {
        label: 'Etat du matériel (en rapport avec les soins)',
        value: 'ETAT_MATERIEL',
      },
      {
        label: 'Les conditions de prélèvements biologiques',
        value: 'CONDITIONS_PRELEVEMENTS_BIOLOGIQUES',
      },
      {
        label: 'Prise en charge de la douleur',
        value: 'PRISE_EN_CHARGE_DOULEUR',
      },
      {
        label: "Résultats d'examens",
        value: 'RESULTATS_EXAMENS',
      },
      {
        label: 'Soins palliatifs (absence ou défaut de plan de soin)',
        value: 'SOINS_PALLIATIFS',
      },
      {
        label: 'Soins post-mortem, conservation du corps',
        value: 'SOINS_POST_MORTEM',
      },
    ],
  },
  {
    label: "Difficulté de recherche d'établissement ou d'un professionnel ou de service",
    value: 'DIFFICULTE_RECHERCHE_ETABLISSEMENT_PROFESSIONNEL_SERVICE',
    children: [
      {
        label: 'Autres',
        value: 'AUTRES',
      },
      {
        label: 'Garde et permanence des soins ambulatoires',
        value: 'GARDE_PERMANENCE_SOINS_AMBULATOIRES',
      },
      {
        label: 'Médecin traitant',
        value: 'MEDECIN_TRAITANT',
      },
      {
        label: 'Spécialiste',
        value: 'SPECIALISTE',
      },
      {
        label: 'Recherche de SMR',
        value: 'RECHERCHE_SMR',
      },
      {
        label: 'Établissement médico-social PA',
        value: 'ETABLISSEMENT_MEDICO_SOCIAL_PA',
      },
      {
        label: 'Établissement médico-social PH',
        value: 'ETABLISSEMENT_MEDICO_SOCIAL_PH',
      },
      {
        label: 'Transfert par manque de lit',
        value: 'TRANSFERT_MANQUE_LIT',
      },
      {
        label: "Délais d'attente pour une place au sein de l'établissement",
        value: 'DELAIS_ATTENTE_PLACE_ETABLISSEMENT',
      },
      {
        label: "Recherche d'un service d'accompagnement à domicile PA",
        value: 'RECHERCHE_SERVICE_ACCOMPAGNEMENT_DOMICILE_PA',
      },
      {
        label: "Recherche d'un service d'accompagnement à domicile PH",
        value: 'RECHERCHE_SERVICE_ACCOMPAGNEMENT_DOMICILE_PH',
      },
    ],
  },
  {
    label: 'Problèmes environnementaux',
    value: 'PROBLEMES_ENVIRONNEMENTAUX',
    children: [
      {
        label: "Problématiques ou gestion des déchets d'activités de soins à risques infectieux (DASRI)",
        value: 'GESTION_DECHETS_DASRI',
      },
      {
        label: 'Situation exceptionnelle (exemple : canicule, innondations..)',
        value: 'SITUATION_EXCEPTIONNELLE',
      },
    ],
  },
  {
    label: 'Problèmes liés au transport Sanitaire',
    value: 'PROBLEMES_TRANSPORT_SANITAIRE',
    children: [
      {
        label: 'Conditions de conduite du véhicule',
        value: 'CONDITIONS_CONDUITE_VEHICULE',
      },
      {
        label:
          "Conditions de prise en charge du patient au début et à la fin (par exemple, délai d'attente, lieu de dépôt...)",
        value: 'CONDITIONS_PRISE_EN_CHARGE_PATIENT',
      },
      {
        label: "Défaut d'offre",
        value: 'DEFAUT_OFFRE',
      },
      {
        label: 'Défaut de garde',
        value: 'DEFAUT_GARDE',
      },
      {
        label:
          "Non-respect des dispositions réglementaires en vigueur (absence de tenue professionnelle, véhicule nonconforme et hygiène, non-respect de l'obligation de présence d'un ambulancier dans la cellule sanitaire...)",
        value: 'NON_RESPECT_DISPOSITIONS_REGLEMENTAIRES',
      },
      {
        label: 'Transfert entre établissements',
        value: 'TRANSFERT_ENTRE_ETABLISSEMENTS',
      },
    ],
  },
];

export const MOTIFS_DATA = MOTIFS_HIERARCHICAL_DATA.flatMap((parent) =>
  parent.children.map((child) => ({
    id: `${parent.value}/${child.value}`,
    label: child.label,
    category: parent.label,
  })),
);

export const motifLabelsById: Record<string, string> = Object.fromEntries(
  MOTIFS_DATA.map((motif) => [motif.id, motif.label]),
);

export const motifCategories = Array.from(new Set(MOTIFS_DATA.map((m) => m.category)));
