-- Mayotte est devenue « Département-Région de Mayotte » : le référentiel géographique
-- officiel a fait évoluer son code de collectivité de 976D vers 976R.
--
-- La table Commune reprend ce code depuis la source à chaque synchronisation. La fiche de
-- la collectivité doit donc suivre, faute de quoi le rapprochement échoue et les requêtes
-- localisées à Mayotte ne trouvent plus leur conseil départemental.
--
-- La DDETS de Mayotte n'est pas concernée : elle porte 976DD, forme reconnue quel que soit
-- le code de collectivité.
UPDATE "public"."Entite"
SET "ctcdCode" = '976R'
WHERE "entiteTypeId" = 'CD'
  AND "departementCode" = '976'
  AND "ctcdCode" = '976D';
