INSERT INTO "public"."Entite" ("id","nomComplet","label","email","emailDomain","organizationalUnit","isActive","entiteTypeId","entiteMereId", "ctcdCode","regionCode","regLib","dptLib")
VALUES
    ('957cb710-4eff-40a9-8d5b-574905b487ab','DD Cher (18)','DD Cher (18)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('cf3975c7-1e63-4219-ae6d-7b31b0ac8fd5','DD Eure et Loire (28)','DD Eure et Loire (28)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('30399b6f-d547-4878-a871-67b8bd41dc49','DD Indre (36)','DD Indre (36)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('dd6743aa-ff2a-42a6-8dc9-4a9018025a4e','DD Indre et Loire (37)','DD Indre et Loire (37)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('df7642f6-63e3-42ee-994a-18fee5b72c23','DD Loir et Cher (41)','DD Loir et Cher (41)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('06ed9284-3150-4af5-a685-661f0ffa3a0d','DD Loiret (45)','DD Loiret (45)','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('c1c0e35e-cf0a-477d-90ac-a25977804870','DG','DG','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('4cd506e2-23aa-494a-8972-fc7a26a3e4a1','DSTRAT','DSTRAT','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('f0bbe388-2a5b-4479-ad3a-83df8d2af831','DOMS','DOMS','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('eaa7a7b2-e3ad-4add-b68a-9d8dc9786a04','DOS','DOS','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL),
    ('ad6c91c5-3b19-4e7d-a21a-7db742264db6','DSPE','DSPE','','','',true,'ARS','2df2b1f1-3c5d-43d6-b30c-a01062aa2edc','24A','24','Centre-Val de Loire',NULL)
ON CONFLICT ("id") DO NOTHING;