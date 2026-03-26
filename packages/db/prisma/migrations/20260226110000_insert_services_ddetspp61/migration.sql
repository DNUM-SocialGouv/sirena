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
  ('e7f1a2b3-4c5d-4e6f-8a9b-0c1d2e3f4a5b', 'Service parcours des personnes vulnérables', 'Parcours personnes vulnérables', '', '', '', '', '', '', true, 'DD', '8dc7550c-2614-423d-99bf-7d4371aede1e'),
  ('f8a2b3c4-5d6e-4f7a-9b0c-1d2e3f4a5b6c', 'Service parcours intégrés d''insertion', 'Parcours intégrés insertion', '', '', '', '', '', '', true, 'DD', '8dc7550c-2614-423d-99bf-7d4371aede1e'),
  ('a9b4c5d6-e7f8-4a0b-1c2d-3e4f5a6b7c8d', 'Service politique de la ville', 'Politique de la ville', '', '', '', '', '', '', true, 'DD', '8dc7550c-2614-423d-99bf-7d4371aede1e')
ON CONFLICT ("id") DO NOTHING;
