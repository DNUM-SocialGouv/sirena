INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId", "ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('f3a1d2e7-4b8c-4f91-a3d5-6c2e9b07f1a4','DD 08','DD 08','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('9c4e5b2a-1d7f-4a83-b6c2-3f8e0d94a251','DD 10','DD 10','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('7b2f8c1e-5a3d-4e96-c4b1-2d7a0f63e842','DD 51','DD 51','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('4d9a3f7b-2c6e-4b12-d8a3-5e1c0b47f293','DD 52','DD 52','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('1e6c4a9d-8b2f-4d57-e1c4-7a3f0e82b134','DD 54','DD 54','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('8a5e1c3f-6d4b-4f28-f2d5-9b4a0c61e725','DD 55','DD 55','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('2f7b9e4c-3a5d-4c73-a3e6-1c5b0d98f416','DD 57','DD 57','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('6c3d8a2e-7f1b-4e94-b4f7-8d2c0a54e307','DD 67','DD 67','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('3e8f5b1d-4c9a-4a65-c5a8-2e9d0b37f198','DD 68','DD 68','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('5a2c7d9f-1e3b-4b46-d6b9-4f7e0c12a089','DD 88','DD 88','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('d1f4a6c8-9b2e-4d37-e7ca-6b1f0e89d370','Département Biologie et Pharmacie','Département Biologie et Pharmacie','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL),
    ('b9e3c5a7-2f6d-4c18-f8db-3a8c0f46b261','DICE','DICE','','','',true,'ARS','359e7f37-7344-4680-8b78-3101a01b073c','44A','44','Grand Est',NULL)
ON CONFLICT ("id") DO NOTHING;
