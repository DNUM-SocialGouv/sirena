INSERT INTO "public"."Entite" ("id", "nomComplet", "label", "email", "emailDomain", "organizationalUnit", "isActive",
                               "entiteTypeId", "entiteMereId", "ctcdCode", "regionCode", "regLib", "dptLib")
VALUES ('f7a3d1e9-4c2b-4f85-b6d8-9e1a0c73f2d4', 'Service ICEA - Service Inspection – Contrôle – Évaluation - Audit',
        'Service ICEA - Service Inspection – Contrôle – Évaluation - Audit', '', '', '', true, 'ARS',
        'fba90144-1561-4fc6-b3ce-5850ee796e47', '01A', '01', 'Guadeloupe', NULL)
ON CONFLICT ("id") DO NOTHING;
