DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "UploadedFile"
    WHERE "requeteEtapeNoteId" IS NOT NULL
      AND "requeteEtapeId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Aborting: % file(s) still rely solely on requeteEtapeNoteId (requeteEtapeId IS NULL). Rerun the D1 backfill before dropping the column.',
      (SELECT count(*) FROM "UploadedFile" WHERE "requeteEtapeNoteId" IS NOT NULL AND "requeteEtapeId" IS NULL);
  END IF;
END $$;

-- DropForeignKey
ALTER TABLE "UploadedFile" DROP CONSTRAINT "UploadedFile_requeteEtapeNoteId_fkey";

-- AlterTable
ALTER TABLE "UploadedFile" DROP COLUMN "requeteEtapeNoteId";
