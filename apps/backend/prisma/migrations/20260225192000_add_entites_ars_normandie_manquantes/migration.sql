INSERT INTO "Entite" (
  "id",
  "nomComplet",
  "label",
  "email",
  "emailContactUsager",
  "telContactUsager",
  "adresseContactUsager",
  "emailDomain",
  "organizationalUnit",
  "isActive",
  "entiteTypeId",
  "entiteMereId"
) VALUES
  -- MIC (1)
  ('7f2a9b1c-4d3e-4a8f-b6c5-8e1d0f2a3b4c', 'Mission Inspection-Controle (MIC)', 'MIC', 'ars-normandie-inspection@ars.sante.fr', '', '', '', '', '', true, 'ARS', '4af829ff-07c1-425d-85d6-83b5f97e4422'),
  -- Délégations Départementales direction (1) + 5 services
  ('a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62', 'Délégations Départementales (DD)', 'DD', '', '', '', '', '', '', true, 'ARS', '4af829ff-07c1-425d-85d6-83b5f97e4422'),
  ('2c9f4b7e-1a8d-4e63-b0c5-9d2f6a3e8b71', 'Délégation Départementale du Calvados (DD 14)', 'DD14', 'ars-normandie-dd14@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62'),
  ('5d1e8a3f-9b6c-4f27-a2e0-7c4d1b9f3e85', 'Délégation Départementale de l''Eure (DD 27)', 'DD27', 'ars-normandie-dd27@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62'),
  ('e4b7c2a9-3f8d-4a1e-6b0c-5d9e2f7a8b3c', 'Délégation Départementale de la Seine-Maritime (DD 76)', 'DD76', 'ars-normandie-dd76@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62'),
  ('1f6a9d4e-8c2b-4e53-a7f0-2b5c8e1d9a4f', 'Délégation Départementale de l''Orne (DD 61)', 'DD61', 'ars-normandie-dd61@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62'),
  ('9b3e7c1a-5f4d-4b82-e6a0-3c8f2d1b7e59', 'Délégation Départementale de la Manche (DD 50)', 'DD50', 'ars-normandie-dd50@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'a8e5c912-6b4f-4d2a-9c7e-1f3b0d8a5e62'),
  -- PAJ (1)
  ('c6d2f8a4-1e9b-4c73-b5a0-8d2f6e1c9b4a', 'PAJ', 'PAJ', 'ars-normandie-juridique@ars.sante.fr', '', '', '', '', '', true, 'ARS', '4af829ff-07c1-425d-85d6-83b5f97e4422'),
  -- Secrétariat général (1)
  ('3a8f2d6b-7e1c-4a94-f0b5-2e8c9d1a6f3b', 'Secrétariat général', 'Secrétariat général', '', '', '', '', '', '', true, 'ARS', '4af829ff-07c1-425d-85d6-83b5f97e4422'),
  -- DAMTN services (2)
  ('f7e2a9c5-4b8d-4e16-9f0a-3d6c2b8e1f7a', 'Professions Non Médicales (PNM)', 'PNM', 'ars-normandie-prof-non-medicales@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'dc1fe975-28fd-490d-be5b-814a5bdd9c6b'),
  ('8d4b1e6f-a3c9-4f72-b5d0-1e9a7c4f2b8d', 'Professions Médicales (PM)', 'PM', 'ars-normandie-professionnels-sante@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'dc1fe975-28fd-490d-be5b-814a5bdd9c6b'),
  -- DSP services (6)
  ('2e5c9a7f-1b4d-4e83-a6f0-9c2d8b5e1a3f', 'Pôle Prévention Santé (PPS)', 'PPS', 'ars-normandie-esms-pds@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837'),
  ('b1f8d3e6-9a2c-4f75-8b0d-4e7a1c9f3b62', 'Santé Environnement (SE) DD 76', 'SE76', 'ars-normandie-se76@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837'),
  ('4c7a2e9b-6d1f-4a58-c0e3-2b9f5d8a1c7e', 'Santé Environnement (SE) DD 14', 'SE14', 'ars-normandie-se14@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837'),
  ('d9e3b6a1-8f4c-4e27-9d0b-5a2f7c1e8d4b', 'Santé Environnement (SE) DD 27', 'SE27', 'ars-normandie-se27@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837'),
  ('6a1f4c8e-2b9d-4f53-a7e0-8c3b6d2f9a1e', 'Santé Environnement (SE) DD 50', 'SE50', 'ars-normandie-se50@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837'),
  ('e2b9d7f4-1a6c-4b83-9e0d-7f5a2c8b3e61', 'Santé Environnement (SE) DD 61', 'SE61', 'ars-normandie-se61@ars.sante.fr', '', '', '', '', '', true, 'ARS', '5ae90e30-8e67-4dba-8b78-55fcac20f837')
ON CONFLICT ("id") DO NOTHING;
