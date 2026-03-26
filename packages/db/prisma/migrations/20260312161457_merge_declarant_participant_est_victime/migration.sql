WITH to_merge AS (
  -- Step 0 : Find pairs: (#A = declarant with estVictime=true, #B = separate participant for same requete)
  SELECT
    d.id              AS declarant_id,
    p.id              AS participant_id,
    d."declarantDeId" AS requete_id
  FROM "PersonneConcernee" d
  JOIN "PersonneConcernee" p ON p."participantDeId" = d."declarantDeId"
  WHERE d."estVictime" = true
    AND d."declarantDeId" IS NOT NULL
    AND d."participantDeId" IS NULL
    AND p.id != d.id
),
-- Step 1: Transfer declarantDeId to #B and mark estVictime = true
set_participant AS (
  UPDATE "PersonneConcernee" pc
  SET "declarantDeId" = tm.requete_id,
      "estVictime"    = true
  FROM to_merge tm
  WHERE pc.id = tm.participant_id
)
-- Step 2: Delete #A — cascades to its Identite and Adresse (onDelete: Cascade in schema)
DELETE FROM "PersonneConcernee"
WHERE id IN (SELECT declarant_id FROM to_merge);
