-- Link each note's files to the note's step (idempotent).
UPDATE "UploadedFile" uf
SET "requeteEtapeId" = n."requeteEtapeId"
FROM "RequeteEtapeNote" n
WHERE uf."requeteEtapeNoteId" = n."id"
  AND uf."requeteEtapeId" IS NULL;
