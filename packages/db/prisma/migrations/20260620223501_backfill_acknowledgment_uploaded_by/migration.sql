-- Preserve the acknowledgment sender on the file before system notes are dropped.
UPDATE "UploadedFile" uf
SET "uploadedById" = n."authorId"
FROM "RequeteEtapeNote" n
WHERE uf."requeteEtapeNoteId" = n."id"
  AND uf."uploadedById" IS NULL
  AND n."authorId" IS NOT NULL;
