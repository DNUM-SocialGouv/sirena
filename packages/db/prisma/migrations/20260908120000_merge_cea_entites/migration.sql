-- Merge the two "Collectivité européenne d'Alsace" CD entities (ctcdCode 6AE)
-- into one. Survivor: Haut-Rhin 6468bfc0 (holds the users). Victim: Bas-Rhin 3ab308d4.
-- All victim references are moved to the survivor, then the victim is deleted.
-- Defensive/idempotent: no-op when the victim is already gone.

-- Users
UPDATE "public"."User"
SET "entiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

-- RequeteEtape references RequeteEntite via a non-deferrable composite FK, so we
-- copy the join rows to the survivor, repoint the steps, then delete the old rows.
INSERT INTO "public"."RequeteEntite" ("requeteId", "entiteId", "statutId", "prioriteId")
SELECT "requeteId", '6468bfc0-09d6-43ba-9eb4-def81d0df8ee', "statutId", "prioriteId"
FROM "public"."RequeteEntite"
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7'
ON CONFLICT ("requeteId", "entiteId") DO NOTHING;

UPDATE "public"."RequeteEtape"
SET "entiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

DELETE FROM "public"."RequeteEntite"
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

-- SituationEntite (drop victim rows that would collide with the survivor first)
DELETE FROM "public"."SituationEntite" v
WHERE v."entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7'
  AND EXISTS (
    SELECT 1 FROM "public"."SituationEntite" s
    WHERE s."situationId" = v."situationId"
      AND s."entiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
  );

UPDATE "public"."SituationEntite"
SET "entiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

-- Files
UPDATE "public"."UploadedFile"
SET "entiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE "entiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

-- Defensive: none in prod, protects other environments
UPDATE "public"."Entite"
SET "entiteMereId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE "entiteMereId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

UPDATE "public"."FeatureFlag"
SET "entiteIds" = array_replace("entiteIds",
  '3ab308d4-c8e7-499c-a2a2-a32735fb97e7',
  '6468bfc0-09d6-43ba-9eb4-def81d0df8ee')
WHERE '3ab308d4-c8e7-499c-a2a2-a32735fb97e7' = ANY ("entiteIds");

-- Survivor now covers both departments: drop its departementCode (keeps ctcdCode 6AE)
UPDATE "public"."Entite"
SET "departementCode" = NULL,
    "dptLib" = NULL
WHERE "id" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee';

-- Repoint assignment steps (RequeteEtape.assignedEntiteId, FK ON DELETE RESTRICT) to the
-- survivor. If the requete already has a survivor-assigned step, the victim step is a
-- duplicate and is deleted (it can't be null-ed: a CHECK ties type='ASSIGNMENT' to a
-- non-null assignedEntiteId).
UPDATE "public"."RequeteEtape" e
SET "assignedEntiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
WHERE e."assignedEntiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7'
  AND NOT EXISTS (
    SELECT 1 FROM "public"."RequeteEtape" o
    WHERE o."requeteId" = e."requeteId"
      AND o."assignedEntiteId" = '6468bfc0-09d6-43ba-9eb4-def81d0df8ee'
  );

DELETE FROM "public"."RequeteEtape"
WHERE "assignedEntiteId" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';

-- Remove the victim (no longer referenced)
DELETE FROM "public"."Entite"
WHERE "id" = '3ab308d4-c8e7-499c-a2a2-a32735fb97e7';
