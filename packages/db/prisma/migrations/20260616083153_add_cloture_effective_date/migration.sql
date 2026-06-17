-- AlterTable
ALTER TABLE "RequeteEtape" ADD COLUMN     "clotureEffectiveDate" DATE;

-- Backfill existing closed processing steps with their technical creation date in France timezone.
UPDATE "RequeteEtape"
SET "clotureEffectiveDate" = ("createdAt" AT TIME ZONE 'Europe/Paris')::date
WHERE "statutId" = 'CLOTUREE'
  AND "clotureEffectiveDate" IS NULL;

-- Closed processing steps must always carry a business closure date.
ALTER TABLE "RequeteEtape"
ADD CONSTRAINT "RequeteEtape_clotureEffectiveDate_required_when_closed"
CHECK ("statutId" <> 'CLOTUREE' OR "clotureEffectiveDate" IS NOT NULL);
