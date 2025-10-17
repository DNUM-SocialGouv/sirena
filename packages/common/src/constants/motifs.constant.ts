export const MOTIFS_SOUS_MOTIFS_DATA = [
  {
    label: "Activités d'esthétique non réglementées",
    value: 'activites-esthetique-non-reglementees',
    children: [
      { label: 'Autres', value: 'autres' },
      { label: "Défaut de déclaration d'activité", value: 'defaut-declaration-activite' },
      {
        label:
          'Non respect des règles (hygiène, conformité des locaux, consentement éclairé, tarifs pratiqués, formations…)',
        value: 'non-respect-regles',
      },
    ],
  },
  {
    label: 'Médicaments',
    value: 'medicaments',
    children: [
      { label: 'Problématique de circuit du médicament', value: 'problematique-circuit-medicament' },
      { label: 'Stockage des médicaments', value: 'stockage-medicaments' },
      { label: 'Vente de médicaments sur internet', value: 'vente-medicaments-internet' },
    ],
  },
  {
    label: 'Facturations et honoraires',
    value: 'facturations-honoraires',
    children: [
      { label: 'Autres', value: 'autres' },
      { label: "Problème d'honoraires", value: 'probleme-honoraires' },
      { label: 'Problème de facturation', value: 'probleme-facturation' },
      { label: 'Honoraires professions libérales', value: 'honoraires-professions-liberales' },
    ],
  },
  {
    label: 'Hôtellerie locaux restauration',
    value: 'hotellerie-locaux-restauration',
    children: [
      { label: 'Accessibilité des locaux (aux personnes à mobilité réduite, parking…)', value: 'accessibilite-locaux' },
      { label: 'Accueil', value: 'accueil' },
      { label: 'Admission', value: 'admission' },
      { label: 'Autres', value: 'autres' },
      {
        label: 'Configuration des locaux (équipement sanitaire, superficie chambre, équipements divers)',
        value: 'configuration-locaux',
      },
      { label: 'Entretien (fenêtre endommagé, digicode non fonctionnel, …)', value: 'entretien' },
      { label: 'Hygiène (entretien, ménage…)', value: 'hygiene' },
      {
        label: 'La gestion des ressources ou des biens de la personne (dépôt, vols, perte…)',
        value: 'gestion-ressources-biens',
      },
      { label: 'Les équipements à usage personnel (télévision…)', value: 'equipements-usage-personnel' },
      { label: "Absence de lieu d'accueil pour la famille", value: 'absence-lieu-accueil-famille' },
      { label: 'Sécurité des locaux (locaux mal sécurisé)', value: 'securite-locaux' },
      { label: 'Sécurité des personnes (chute...)', value: 'securite-personnes' },
      {
        label: 'Service de restauration (horaires des repas, quantité servie, qualité des repas…)',
        value: 'service-restauration',
      },
    ],
  },
  {
    label: 'Informations et droits des usagers',
    value: 'informations-droits-usagers',
    children: [
      {
        label: "Informations sur l'accompagnement à la fin de vie (Loi Léonetti, demande évolutions législation)",
        value: 'info-accompagnement-fin-vie',
      },
      { label: 'Autres', value: 'autres' },
      { label: 'Dossier médical non communiqué', value: 'dossier-medical-non-communique' },
      {
        label: "Informations sur la désignation d'une personne de confiance",
        value: 'info-designation-personne-confiance',
      },
      {
        label: 'Informations du patient et résident suite à un événement (indésirable)',
        value: 'info-patient-evenement',
      },
      {
        label: 'Informations du patient sur sa pathologie, son opération, les risques encourus',
        value: 'info-patient-pathologie',
      },
      { label: "Modalités d'annonce d'un décès", value: 'modalites-annonce-deces' },
      { label: 'Recueil du consentement', value: 'recueil-consentement' },
      { label: 'Non-respect du secret médical', value: 'non-respect-secret-medical' },
    ],
  },
  {
    label: 'Maltraitance professionnels ou entourage',
    value: 'maltraitance-professionnels-entourage',
    children: [
      { label: 'Discriminations', value: 'discriminations' },
      { label: 'Exposition à un environnement violent', value: 'exposition-environnement-violent' },
      { label: 'Négligences actives', value: 'negligences-actives' },
      { label: 'Négligences passives', value: 'negligences-passives' },
      { label: 'Privation de soin, notamment des besoins fondamentaux', value: 'privation-soin-besoins-fondamentaux' },
      { label: 'Privation ou violation de droits, des libertés', value: 'privation-violation-droits-libertes' },
      { label: 'Violences matérielles et financières', value: 'violences-materielles-financieres' },
      { label: 'Violences médicales ou médicamenteuses', value: 'violences-medicales-medicamenteuses' },
      { label: 'Violences physiques', value: 'violences-physiques' },
      { label: 'Violences psychiques ou morales', value: 'violences-psychiques-morales' },
      { label: 'Violences sexuelles', value: 'violences-sexuelles' },
    ],
  },
  {
    label: 'Mauvaise attitude des professionnels',
    value: 'mauvaise-attitude-professionnels',
    children: [
      { label: 'Autres', value: 'autres' },
      { label: "Défaut d'encadrement en stage", value: 'defaut-encadrement-stage' },
      { label: "Refus d'aide de la part d'un professionnel", value: 'refus-aide-professionnel' },
      {
        label: "Relations entre la famille/l'entourage et les professionnels",
        value: 'relations-famille-professionnels',
      },
      { label: "Relations entre l'usager et les professionnels", value: 'relations-usager-professionnels' },
      {
        label: 'Refus de consultation par un professionnel de santé libéral ',
        value: 'refus-consultation-professionnel-liberal',
      },
      {
        label: "Refus d'intervention au domicile (exemple : SOS médecins, IDEL ...)",
        value: 'refus-intervention-domicile',
      },
    ],
  },
  {
    label: 'Pratique non conventionnelle',
    value: 'pratique-non-conventionnelle',
    children: [
      { label: 'Dérives sectaires', value: 'derives-sectaires' },
      {
        label: 'Exercice illegal / usurpation de titre (médecine ou autre profession)',
        value: 'exercice-illegal-usurpation-titre',
      },
    ],
  },
  {
    label: "Problèmes d'organisation ou de ressources humaines",
    value: 'problemes-organisation-ressources-humaines',
    children: [
      { label: "Conflit avec la direction d'établissement ou de service", value: 'conflit-direction-etablissement' },
      { label: 'Conflit social', value: 'conflit-social' },
      {
        label: 'Manque de personnels encadrant dans les instituts de formation (profession para-médical et sociale)',
        value: 'manque-personnels-encadrant-instituts',
      },
      { label: 'Manque de personnel soignant', value: 'manque-personnel-soignant' },
      { label: 'Absence de MEDEC', value: 'absence-medec' },
      { label: 'Manque de qualification du personnel (diplôme...)', value: 'manque-qualification-personnel' },
      { label: 'Manque de personnel non soignant', value: 'manque-personnel-non-soignant' },
    ],
  },
  {
    label: "Qualité de l'accompagnement ou du service",
    value: 'qualite-accompagnement-service',
    children: [
      {
        label:
          "Problème d'accompagnement et/ou suivi individuel : projet de vie, suivi social, éducatif, administratif…",
        value: 'probleme-accompagnement-suivi-individuel',
      },
      { label: 'Non respect des programmes de formation', value: 'non-respect-programmes-formation' },
      { label: "Absence d'animation", value: 'absence-animation' },
      { label: 'Autres', value: 'autres' },
      { label: "Qualité des animations au lieu d'interventions", value: 'qualite-animations-lieu-interventions' },
      {
        label: "Problématique de fonctionnement de l'ESSMS (règlement intérieur, …)",
        value: 'problematique-fonctionnement-essms',
      },
      { label: 'Violences entre usagers', value: 'violences-entre-usagers' },
      { label: "Vilolences d'un usager envers son entourage", value: 'violences-usager-entourage' },
      { label: "Violences d'un usager envers un professionnel", value: 'violences-usager-professionnel' },
      { label: 'Défaut de surveillance (fugue / disparition inquiétante)', value: 'defaut-surveillance' },
    ],
  },
  {
    label: 'Qualité des soins',
    value: 'qualite-soins',
    children: [
      { label: 'Absence ou insuffisance de soins médicaux', value: 'absence-insuffisance-soins-medicaux' },
      {
        label: 'Absence ou insuffisance de soins paramédicaux (repas, hygiène…)',
        value: 'absence-insuffisance-soins-paramedicaux',
      },
      { label: 'Absence ou insuffisance de la rééducation', value: 'absence-insuffisance-reeducation' },
      {
        label:
          'Affections iatrogénes : infections liées aux soins, infections nosocomiales, événements liés à un produit de santé',
        value: 'affections-iatrogenes',
      },
      { label: 'Aide médicale urgente (SAMU)', value: 'aide-medicale-urgente-samu' },
      { label: 'Autres', value: 'autres' },
      {
        label: 'Défaillance ou incident lié aux soins ou à la surveillance (complications, incapacité, décès)',
        value: 'defaillance-incident-soins-surveillance',
      },
      { label: 'Délais de prise en charge', value: 'delais-prise-en-charge' },
      { label: 'Diagnostic, pertinence des examens', value: 'diagnostic-pertinence-examens' },
      { label: 'Etat du matériel (en rapport avec les soins)', value: 'etat-materiel' },
      { label: 'Les conditions de prélèvements biologiques', value: 'conditions-prelevements-biologiques' },
      { label: 'Prise en charge de la douleur', value: 'prise-en-charge-douleur' },
      { label: "Résultats d'examens", value: 'resultats-examens' },
      { label: 'Soins palliatifs (absence ou défaut de plan de soin)', value: 'soins-palliatifs' },
      { label: 'Soins post-mortem, conservation du corps', value: 'soins-post-mortem' },
    ],
  },
  {
    label: "Difficulté de recherche d'établissement ou d'un professionnel ou de service",
    value: 'difficulte-recherche-etablissement-professionnel-service',
    children: [
      { label: 'Autres', value: 'autres' },
      { label: 'Garde et permanence des soins ambulatoires', value: 'garde-permanence-soins-ambulatoires' },
      { label: 'Médecin traitant', value: 'medecin-traitant' },
      { label: 'Spécialiste', value: 'specialiste' },
      { label: 'Recherche de SMR', value: 'recherche-smr' },
      { label: 'Établissement médico-social PA', value: 'etablissement-medico-social-pa' },
      { label: 'Établissement médico-social PH', value: 'etablissement-medico-social-ph' },
      { label: 'Transfert par manque de lit', value: 'transfert-manque-lit' },
      {
        label: "Délais d'attente pour une place au sein de l'établissement",
        value: 'delais-attente-place-etablissement',
      },
      {
        label: "Recherche d'un service d'accompagnement à domicile PA",
        value: 'recherche-service-accompagnement-domicile-pa',
      },
      {
        label: "Recherche d'un service d'accompagnement à domicile PH",
        value: 'recherche-service-accompagnement-domicile-ph',
      },
    ],
  },
  {
    label: 'Problèmes environnementaux',
    value: 'problemes-environnementaux',
    children: [
      {
        label: "Problématiques ou gestion des déchets d'activités de soins à risques infectieux (DASRI)",
        value: 'gestion-dechets-dasri',
      },
      { label: 'Situation exceptionnelle (exemple : canicule, innondations..)', value: 'situation-exceptionnelle' },
    ],
  },
  {
    label: 'Problèmes liés au transport Sanitaire',
    value: 'problemes-transport-sanitaire',
    children: [
      { label: 'Conditions de conduite du véhicule', value: 'conditions-conduite-vehicule' },
      {
        label:
          "Conditions de prise en charge du patient au début et à la fin (par exemple, délai d'attente, lieu de dépôt...)",
        value: 'conditions-prise-en-charge-patient',
      },
      { label: "Défaut d'offre", value: 'defaut-offre' },
      { label: 'Défaut de garde', value: 'defaut-garde' },
      {
        label:
          "Non-respect des dispositions réglementaires en vigueur (absence de tenue professionnelle, véhicule nonconforme et hygiène, non-respect de l'obligation de présence d'un ambulancier dans la cellule sanitaire...)",
        value: 'non-respect-dispositions-reglementaires',
      },
      { label: 'Transfert entre établissements', value: 'transfert-entre-etablissements' },
    ],
  },
];
