-- CSV used: /Users/panda/Projects/sirena/apps/backend/prisma/documents/entites_template.csv

-- INSERT
INSERT INTO "public"."Entite" ("id","nomComplet","label","isActive","email","emailContactUsager","telContactUsager","adresseContactUsager","emailDomain","organizationalUnit","entiteTypeId","entiteMereId","departementCode","regionCode","ctcdCode","dptLib","regLib") VALUES
('212a4937-9b8b-49e1-9a9e-dc4393311b0a', 'DRIHL de Paris', 'DRIHL75', false, '', '', '', '', '', '', 'DD', NULL, '75', '11', '', 'Paris', 'Île-de-France'),
('2cfa0768-52d0-4df0-81d6-f4f3236c3442', 'DRIHL de Seine-Saint-Denis', 'DRIHL93', false, '', '', '', '', '', '', 'DD', NULL, '93', '11', '', 'Seine-Saint-Denis', 'Île-de-France'),
('76d01f1b-471e-4fb9-b813-72cc3b8ec937', 'DRIHL des Hauts-de-Seine', 'DRIHL92', false, '', '', '', '', '', '', 'DD', NULL, '92', '11', '', 'Hauts-de-Seine', 'Île-de-France'),
('b52a9545-743a-4bf4-bb8d-c220a65d5f65', 'DRIHL du Val-de-Marne', 'DRIHL94', false, '', '', '', '', '', '', 'DD', NULL, '94', '11', '', 'Val-de-Marne', 'Île-de-France');

-- UPDATE
UPDATE "public"."Entite" SET "departementCode" = '973', "regionCode" = '3', "ctcdCode" = '973CD', "dptLib" = 'Guyane', "regLib" = 'Guyane' WHERE "label" = 'C. GUY';
UPDATE "public"."Entite" SET "adresseContactUsager" = 'Direction de la Veille et Sécurité sanitaire
13 rue du Landy
93200 Saint-Denis', "organizationalUnit" = 'ARS-IDF' WHERE "label" = 'ARS IDF';
