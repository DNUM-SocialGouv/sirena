-- INSERT
INSERT INTO "public"."Entite" ("id","nomComplet","label","isActive","email","emailContactUsager","telContactUsager","adresseContactUsager","emailDomain","organizationalUnit","entiteTypeId","entiteMereId") VALUES
(gen_random_uuid(), 'Collectivité territoriale unique de La Guyane', 'C. GUY', false, 'csp.paph@ctguyane.fr', '', '', '', 'ctguyane.fr', '', 'CD', NULL);

-- UPDATE
UPDATE "public"."Entite" SET "isActive" = true, "emailDomain" = 'cantal.fr' WHERE "id" = '79d77acf-dfb6-4677-8f06-b0c82c95bfca';
UPDATE "public"."Entite" SET "email" = 'ddets-direction@ain.gouv.fr', "emailDomain" = 'ain.gouv.fr' WHERE "id" = '4f8479b7-b042-497c-9f65-48d79126acf8';
UPDATE "public"."Entite" SET "email" = 'eig-paph@jura.fr', "emailDomain" = 'jura.fr' WHERE "id" = 'f10516f7-1672-43b3-b075-42c5876cc8d9';
UPDATE "public"."Entite" SET "email" = 'protocole.bientraitance@nievre.fr' WHERE "id" = '68166908-630c-4b08-996f-13224e03a5d2';
UPDATE "public"."Entite" SET "email" = 'signalement.esms@haute-saone.fr', "emailDomain" = 'haute-saone.fr' WHERE "id" = '397d55a9-5ee2-4c06-98ce-1f99179fca41';
UPDATE "public"."Entite" SET "email" = 'SignalementPAPH@cotesdarmor.fr', "emailDomain" = 'cotesdarmor.fr' WHERE "id" = '0a51b5b6-272f-4c59-b010-c846dc55142b';
UPDATE "public"."Entite" SET "email" = 'cabinet.president@departement18.fr', "emailDomain" = 'departement18.fr' WHERE "id" = '437e88f2-6784-4c06-8f23-3b3a462165e8';
UPDATE "public"."Entite" SET "email" = 'DPDS-Direction@indre.fr', "emailDomain" = 'indre.fr' WHERE "id" = '4ada6535-2d04-4dda-a20e-d3bba9ec9691';
UPDATE "public"."Entite" SET "email" = 'ddets-alerte@moselle.gouv.fr', "emailDomain" = 'moselle.gouv.fr' WHERE "id" = 'afffad3e-ff3a-4d1e-8ede-055341c4b492';
UPDATE "public"."Entite" SET "email" = 'CD-qualite@oise.fr', "emailDomain" = 'oise.fr' WHERE "id" = '6176821c-f5af-43b2-ad7a-221d72cdca7c';
UPDATE "public"."Entite" SET "email" = 'das.signalement@pasdecalais.fr', "emailDomain" = 'pasdecalais.fr' WHERE "id" = '495194c9-1af4-4840-98ae-d21fe75c2220';
UPDATE "public"."Entite" SET "email" = 'signalementpaph@somme.fr', "emailDomain" = 'somme.fr' WHERE "id" = 'dcebf4a7-3861-48fd-b002-e9eab95054f5';
UPDATE "public"."Entite" SET "email" = 'ddetspp-lceppv@aveyron.gouv.fr', "emailDomain" = 'aveyron.gouv.fr' WHERE "id" = '057a1831-80f4-431e-b46d-23656140ff06';
