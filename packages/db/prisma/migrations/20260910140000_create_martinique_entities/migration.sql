INSERT INTO "public"."Entite" ("id", "nomComplet", "label", "email", "emailDomain", "organizationalUnit", "isActive",
                               "entiteTypeId", "entiteMereId", "ctcdCode", "regionCode", "regLib", "dptLib")
VALUES ('23867c21-5f70-4e04-8886-fb0700318032', 'DA', 'DA', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('c8565801-8821-4fcc-9a11-5c88c2304278', 'DG', 'DG', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('1ab1c571-59ef-466b-a44e-b33c4880aa1b', 'DOS', 'DOS', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('027b2cb3-c073-4824-9ff5-031ec282371d', 'DS', 'DS', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('699c2143-28f0-4aa0-8ab6-603d5d926d18', 'DSP', 'DSP', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('e4f33c11-529e-452e-bdd6-1e28fbe25f72', 'DVS2', 'DVS2', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL),
       ('30bdb28e-2902-4bf0-80ec-3044d0a2a8d4', 'MRICEA', 'MRICEA', '', '', '', true, 'ARS',
        '6fd0050e-79c9-4180-b9b8-84c6c4291051', '02A', '02', 'Martinique', NULL)
ON CONFLICT ("id") DO NOTHING;
