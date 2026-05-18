-- Fix requetes created from the phone platform that were incorrectly
-- attributed the 'TELEPHONE' reception type instead of 'PLATEFORME'.
-- Telephone-platform requetes are identified by their functional id pattern
-- 'YYYY-MM-RT<number>' (see generateRequeteId / SOURCE_PREFIX.TELEPHONIQUE).
-- ---------------------------------------------------------------------------
UPDATE "Requete"
SET "receptionTypeId" = 'PLATEFORME'
WHERE "receptionTypeId" = 'TELEPHONE'
  AND "id" ~ '^[0-9]{4}-[0-9]{2}-RT[0-9]+$';
