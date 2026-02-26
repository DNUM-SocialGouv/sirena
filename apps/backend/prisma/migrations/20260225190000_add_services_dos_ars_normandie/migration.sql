-- Add 9 services under "Direction de l'Offre de Soin" (DOS) ARS Normandie
-- Parent entite: id = cc18d397-8c47-4576-aec9-a0f8edcd37a5
-- Source: Services_Normandie_ARS.json (Direction de l'offre de soins (DOS), service non vide)

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
  ('b8ecf4ef-b3eb-4541-bcf0-96f1dca019bb', 'Transports sanitaires', 'Transports sanitaires', 'ars-normandie-dos-soins-ville-transports-sanitaires@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('ef054f07-d2e7-4f41-8111-6339f9258ea8', 'Transports sanitaires 14', 'Transports 14', 'ars-normandie-dos-transports-sanitaires-14@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('c39a7e7e-6051-4fdf-9b1b-217901607206', 'Transports sanitaires 27', 'Transports 27', 'ars-normandie-dos-transports-sanitaires-27@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('9bb2e5c5-745e-47e9-9274-839226f02e7f', 'Transports sanitaires 50', 'Transports 50', 'ars-normandie-dos-transports-sanitaires-50@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('f0ea8b04-139e-45bd-bbb7-9f02857c4f42', 'Transports sanitaires 61', 'Transports 61', 'ars-normandie-dos-transports-sanitaires-61@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('470577a9-7dbb-4aee-a38d-0082d2796a61', 'Transports sanitaires 76', 'Transports 76', 'ars-normandie-dos-transports-sanitaires-76@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('ebf8af6d-0395-481b-bbb1-adc150b9f00c', 'Pôle Offre Ambulatoire (POA)', 'POA', 'ars-normandie-dos-soins-ville@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('eeb56130-5e3b-40af-9fe2-4b2ea804f150', 'Pôle soins et sûreté des personnes 27-76', 'Soins sûreté 27-76', 'ars-normandie-dos-76-27-soins-psychiatriques@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5'),
  ('a85bedd3-e29f-4732-bc21-fa3fe7af93bd', 'Pôle soins et sûreté des personnes 14-50-61', 'Soins sûreté 14-50-61', 'ars-normandie-dos-14-50-61-soinspsy@ars.sante.fr', '', '', '', '', '', true, 'ARS', 'cc18d397-8c47-4576-aec9-a0f8edcd37a5')
ON CONFLICT ("id") DO NOTHING;
