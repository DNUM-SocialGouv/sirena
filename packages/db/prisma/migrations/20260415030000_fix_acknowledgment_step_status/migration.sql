-- Fix: acknowledgment steps were incorrectly set to FAIT for manual creations.
-- They should only be FAIT for automatic creations (DematSocial or third-party).
UPDATE "public"."RequeteEtape" AS re
SET "statutId" = 'A_FAIRE'
FROM "public"."Requete" AS r
WHERE re."requeteId" = r."id"
  AND re."nom" = 'Envoyer un accusé de réception au déclarant'
  AND re."statutId" = 'FAIT'
  AND re."createdById" IS NULL
  AND r."dematSocialId" IS NULL
  AND r."thirdPartyAccountId" IS NULL;
