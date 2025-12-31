-- Rollback: Rename AUCUNE back to AUTRE in ConsequenceEnum

-- Step 1: Update FaitConsequence references from AUCUNE to AUTRE (if AUCUNE exists)
UPDATE "FaitConsequence"
SET "consequenceId" = 'AUTRE'
WHERE "consequenceId" = 'AUCUNE'
  AND EXISTS (SELECT 1 FROM "ConsequenceEnum" WHERE id = 'AUCUNE');

-- Step 2: Update ConsequenceEnum id from AUCUNE to AUTRE (if AUCUNE exists)
UPDATE "ConsequenceEnum"
SET id = 'AUTRE', label = 'Autre conséquence'
WHERE id = 'AUCUNE';

