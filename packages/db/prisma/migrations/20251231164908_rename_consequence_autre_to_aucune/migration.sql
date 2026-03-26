-- Rename AUTRE to AUCUNE in ConsequenceEnum to align with DematSocial

-- Step 1: Update FaitConsequence references from AUTRE to AUCUNE (if AUTRE exists)
UPDATE "FaitConsequence"
SET "consequenceId" = 'AUCUNE'
WHERE "consequenceId" = 'AUTRE'
  AND EXISTS (SELECT 1 FROM "ConsequenceEnum" WHERE id = 'AUTRE');

-- Step 2: Update ConsequenceEnum id from AUTRE to AUCUNE (if AUTRE exists)
UPDATE "ConsequenceEnum"
SET id = 'AUCUNE', label = 'Aucune de ces conséquences'
WHERE id = 'AUTRE';

