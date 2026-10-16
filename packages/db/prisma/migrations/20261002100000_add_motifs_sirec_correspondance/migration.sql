-- Add new motifs introduced for the SIREC -> SIRENA motif correspondence.
INSERT INTO "MotifEnum" ("id", "label")
VALUES
  ('MALTRAITANCE_PROFESSIONNELS_ENTOURAGE/AUTRES', 'Autres'),
  ('PRATIQUE_NON_CONVENTIONNELLE/AUTRES', 'Autres'),
  ('PROBLEMES_ORGANISATION_RESSOURCES_HUMAINES/AUTRES', 'Autres'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_AMIANTE', 'Habitat : Amiante'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_RADON', 'Habitat : Radon'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_INSALUBRE', 'Habitat : Habitat insalubre'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_SATURNISME', 'Habitat : Saturnisme'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_QUALITE_AIR_INTERIEUR', 'Habitat : Qualité de l''air intérieur'),
  ('PROBLEMES_ENVIRONNEMENTAUX/HABITAT_NUISANCES_SONORES', 'Habitat : Nuisances sonores'),
  ('PROBLEMES_ENVIRONNEMENTAUX/ALIMENTATION_SECURITE', 'Alimentation-nutrition : Sécurité sanitaire des aliments'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_PROTECTION', 'Eaux : Protection de la ressource en eau'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_QUALITE', 'Eaux : Alimentation et qualité de l''eau potable'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_LEGIONNELLES', 'Eaux : Légionnelles'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_CONDITIONNEES', 'Eaux : Eaux conditionnées'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_THERMALES', 'Eaux : Eaux thermales'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_BAIGNADE', 'Eaux : Eaux de baignade'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_PISCINE', 'Eaux : Eaux de piscine'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_USEES', 'Eaux : Eaux usées'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EAUX_NON_POTABLE', 'Eaux : Usages domestiques d''eau non potable'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EXTERIEUR_QUALITE_AIR', 'Environnement extérieur : Qualité de l''air extérieur'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EXTERIEUR_RAYONNEMENTS_NON_IONISANTS', 'Environnement extérieur : Rayonnements non ionisants'),
  ('PROBLEMES_ENVIRONNEMENTAUX/EXTERIEUR_LUTTE_ANTIVECTORIELLE', 'Environnement extérieur : Lutte antivectorielle'),
  ('PROBLEMES_ENVIRONNEMENTAUX/REGLEMENT_INTERNATIONAL', 'Règlement sanitaire international'),
  ('PROBLEMES_ENVIRONNEMENTAUX/AUTRES', 'Autres'),
  ('PROBLEMES_TRANSPORT_SANITAIRE/AUTRES', 'Autres')
ON CONFLICT ("id") DO UPDATE SET "label" = EXCLUDED."label";
