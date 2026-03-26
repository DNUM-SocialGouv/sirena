ALTER TABLE "PersonneConcernee" ADD COLUMN "estAnonyme" BOOLEAN;

UPDATE "PersonneConcernee" 
SET "estAnonyme" = "veutGarderAnonymat" 
WHERE "veutGarderAnonymat" IS NOT NULL;
