-- CSV used: /Users/panda/Projects/sirena/apps/backend/prisma/documents/entites_template.csv

-- INSERT
INSERT INTO "public"."Entite" ("id","nomComplet","label","isActive","email","emailContactUsager","telContactUsager","adresseContactUsager","emailDomain","organizationalUnit","entiteTypeId","entiteMereId","departementCode","regionCode","ctcdCode","dptLib","regLib") VALUES
('0b678a53-2753-43ad-b407-b66119dcf3f4', 'DRIHL de Seine-et-Marne', 'DRIHL77', true, 'ddets-supervision@seine-et-marne.gouv.fr', 'ddets-supervision@seine-et-marne.gouv.fr', '', '', '', '', 'DD', NULL, '77', '11', '77DD', 'Seine-et-Marne', 'Œle-de-France'),
('69d44731-498c-4956-a8fa-d6f98ef1b19e', 'DRIHL des Yvelines', 'DRIHL78', true, 'ddets-hebergement@yvelines.gouv.fr', 'ddets-hebergement@yvelines.gouv.fr', '', '', '', '', 'DD', NULL, '78', '11', '78DD', 'Yvelines', 'Œle-de-France'),
('402c659d-82c6-4283-b6eb-9c09483627f9', 'DRIHL de l''Essonne', 'DRIHL91', true, 'ddets-direction@essonne.gouv.fr', 'ddets-direction@essonne.gouv.fr', '', '', '', '', 'DD', NULL, '91', '11', '91DD', 'Essonne', 'Œle-de-France'),
('d118dd56-7af1-4fe0-89de-999471e137c8', 'DRIHL du Val-d''Oise', 'DRIHL95', true, 'ddets-direction@val-doise.gouv.fr', 'ddets-direction@val-doise.gouv.fr', '', '', '', '', 'DD', NULL, '95', '11', '95DD', 'Val-d''Oise', 'Œle-de-France');

-- UPDATE
UPDATE "public"."Entite" SET "email" = 'sahi.udhl75.drihl-if@developpement-durable.gouv.fr', "emailContactUsager" = 'sahi.udhl75.drihl-if@developpement-durable.gouv.fr' WHERE "label" = 'DRIHL75';
UPDATE "public"."Entite" SET "email" = 'shal.udhl92.drihl-if@developpement-durable.gouv.fr', "emailContactUsager" = 'shal.udhl92.drihl-if@developpement-durable.gouv.fr' WHERE "label" = 'DRIHL92';
UPDATE "public"."Entite" SET "email" = 'service.inspection@isere.fr', "emailDomain" = '@isere.fr' WHERE "label" = 'CD38';
UPDATE "public"."Entite" SET "email" = 'sirena@valdemarne.fr', "emailDomain" = '@valdemarne.fr' WHERE "label" = 'CD94';
UPDATE "public"."Entite" SET "email" = 'signalement-majeurs@territoiredebelfort.fr' WHERE "label" = 'CD90';
UPDATE "public"."Entite" SET "email" = 'ddets-enquete@saone-et-loire.gouv.fr', "emailDomain" = '@saone-et-loire.gouv.fr' WHERE "label" = 'DDETS71';
UPDATE "public"."Entite" SET "email" = 'cd24.crip@dordogne.fr', "emailDomain" = '@dordogne.fr' WHERE "label" = 'CD24';
UPDATE "public"."Entite" SET "email" = 'cripa@le64.fr', "emailDomain" = '@le64.fr' WHERE "label" = 'CD64';
UPDATE "public"."Entite" SET "email" = 'signalements.paph@tarnetgaronne.fr', "emailDomain" = '@tarn-et-garonne.gouv.fr' WHERE "label" = 'DDETSPP82';
