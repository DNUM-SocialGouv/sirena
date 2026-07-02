INSERT INTO "public"."Entite" ("id", "nomComplet", "label", "email", "emailDomain", "organizationalUnit", "isActive",
                               "entiteTypeId", "entiteMereId", "ctcdCode", "regionCode", "regLib", "dptLib")
VALUES ('c2e8b5f1-7d3a-4e62-a9c4-1f6b0d84e3a7', 'Direction de la santé publique',
        'Direction de la santé publique', '', '', '', true, 'ARS',
        'aaab82ff-ccda-4fc6-9edc-b8cce4a5c893', '27A', '27', 'Bourgogne-Franche-Comté', NULL)
ON CONFLICT ("id") DO NOTHING;
