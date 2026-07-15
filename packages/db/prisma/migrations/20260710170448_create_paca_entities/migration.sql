INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId", "ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('f69cfc53-cd66-4eb2-8483-84678c72c589','DD04','DD04','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('9ca2cd67-132d-43a9-8827-41060a95f396','DD05','DD05','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('43551df1-06be-43f0-9d24-e42df54bc101','DD06','DD06','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('9f557db0-5a85-4748-9a64-01b11fbae354','DD13','DD13','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('66630e1a-8410-4cd1-82a6-5d6456255c86','DD83','DD83','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('8cf411c3-7394-4b0a-8049-56ca5ff4850e','DD84','DD84','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('bfa90277-ff10-4f65-bef6-0fe90c80f187','DOMS','DOMS','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('439140db-dc77-4e68-9b3c-cba4b27fe618','DOS - Département Pharmacie et Biologie','DOS - Département Pharmacie et Biologie','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('86d3e504-37a1-416d-89d6-e02a2cba0224','DSDP','DSDP','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('ec00b3a5-60f6-4f6a-8c9b-a0852081c848','DSPE - EIGS','DSPE - EIGS','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL),
    ('d7c481c6-a1dd-4558-bdfd-04cad086aaca','DAJI - SICR','DAJI - SICR','','','',true,'ARS','acf617c0-892a-4af1-a757-125409ffccdd','93A','93','Provence-Alpes-Côte d''Azur',NULL)
ON CONFLICT ("id") DO NOTHING;