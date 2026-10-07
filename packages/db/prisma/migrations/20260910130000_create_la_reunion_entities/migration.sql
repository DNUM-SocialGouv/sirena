INSERT INTO "public"."Entite" ("id", "nomComplet", "label", "email", "emailDomain", "organizationalUnit", "isActive",
                               "entiteTypeId", "entiteMereId", "ctcdCode", "regionCode", "regLib", "dptLib")
VALUES ('7ca97bda-13d9-4e9d-b001-acc26d68cebd', 'Mission Inspections Contrôles et Réclamations (MICR)',
        'Mission Inspections Contrôles et Réclamations (MICR)', '', '', '', true, 'ARS',
        'e30f5f2d-de67-4e46-a0a0-db7fc1d54337', '04A', '04', 'La Réunion', NULL)
ON CONFLICT ("id") DO NOTHING;
