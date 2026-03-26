UPDATE "PersonneConcernee" 
SET "veutGarderAnonymat" = "estAnonyme" 
WHERE "veutGarderAnonymat" IS NULL AND "estAnonyme" IS NOT NULL;

ALTER TABLE "PersonneConcernee" DROP COLUMN "estAnonyme";
