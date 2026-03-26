-- Update mis en cause types: replace AUTRE/NPJM with AUTRE_PROFESSIONNEL and remove legacy types.

-- Step 1: Update MisEnCause rows to AUTRE_PROFESSIONNEL.
UPDATE "MisEnCause"
SET "misEnCauseTypeId" = NULL,
    "misEnCauseTypePrecisionId" = NULL
WHERE "misEnCauseTypeId" IN ('AUTRE', 'NPJM');

-- Step 2: Remove legacy type entries from MisEnCauseTypeEnum.
DELETE FROM "MisEnCauseTypeEnum"
WHERE id IN ('AUTRE', 'NPJM');

