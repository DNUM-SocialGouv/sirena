-- Add identity fields on MisEnCause
ALTER TABLE "public"."MisEnCause"
ADD COLUMN "civilite" TEXT NOT NULL DEFAULT '',
ADD COLUMN "nom" TEXT NOT NULL DEFAULT '',
ADD COLUMN "prenom" TEXT NOT NULL DEFAULT '';

-- Move existing commentaire content into nom, then clear commentaire
UPDATE "public"."MisEnCause"
SET
  "nom" = "commentaire",
  "commentaire" = '';
