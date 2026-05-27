CREATE TYPE "MesureProtection" AS ENUM ('MANDATAIRE_JUDICIAIRE', 'HABILITATION_FAMILIALE', 'NON');

ALTER TABLE "PersonneConcernee" ADD COLUMN "mesureProtection" "MesureProtection";
