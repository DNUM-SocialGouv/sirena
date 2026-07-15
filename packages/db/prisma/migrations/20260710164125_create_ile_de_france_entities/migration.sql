INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId", "ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('6f87d945-2fc1-4139-9219-a60ceb1c8789','DM AUTONOMIE','DM AUTONOMIE','','','',true,'ARS','ec8c1403-6edb-4b55-8f45-c3efcd139404','11A','11','Île-de-France',NULL),
    ('64915985-d232-4935-b5c9-6f601149ae16','IRAS','IRAS','','','',true,'ARS','ec8c1403-6edb-4b55-8f45-c3efcd139404','11A','11','Île-de-France',NULL),
    ('fd2b7e92-0b5f-4d43-9f19-d8c36d19dc15','SDCOVID','SDCOVID','','','',true,'ARS','ec8c1403-6edb-4b55-8f45-c3efcd139404','11A','11','Île-de-France',NULL),
    ('cb0fe03f-1034-4b28-b16c-9db0e9d04c70','Siège (SRR et CAR)','Siège (SRR et CAR)','','','',true,'ARS','ec8c1403-6edb-4b55-8f45-c3efcd139404','11A','11','Île-de-France',NULL)
ON CONFLICT ("id") DO NOTHING;