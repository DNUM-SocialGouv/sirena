-- NON_RENSEIGNE answers collapse back to null: the boolean model cannot hold them.

ALTER TABLE "Situation"
  ALTER COLUMN "estLieAuSignalement" TYPE BOOLEAN
    USING CASE "estLieAuSignalement"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END;

ALTER TABLE "PersonneConcernee"
  ALTER COLUMN "estHandicapee" TYPE BOOLEAN
    USING CASE "estHandicapee"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END,
  ALTER COLUMN "estVictimeInformee" TYPE BOOLEAN
    USING CASE "estVictimeInformee"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END,
  ALTER COLUMN "veutGarderAnonymat" TYPE BOOLEAN
    USING CASE "veutGarderAnonymat"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END,
  ALTER COLUMN "estSignalementProfessionnel" TYPE BOOLEAN
    USING CASE "estSignalementProfessionnel"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END,
  ALTER COLUMN "aAutrePersonnes" TYPE BOOLEAN
    USING CASE "aAutrePersonnes"
      WHEN 'OUI' THEN true
      WHEN 'NON' THEN false
    END;

DROP TYPE "ReponseOuiNon";

UPDATE "PersonneConcernee" SET "mesureProtection" = NULL WHERE "mesureProtection" = 'NON_RENSEIGNE';

ALTER TYPE "MesureProtection" RENAME TO "MesureProtection_old";
CREATE TYPE "MesureProtection" AS ENUM ('MANDATAIRE_JUDICIAIRE', 'MANDATAIRE_FAMILIAL', 'NON');
ALTER TABLE "PersonneConcernee"
  ALTER COLUMN "mesureProtection" TYPE "MesureProtection"
    USING "mesureProtection"::text::"MesureProtection";
DROP TYPE "MesureProtection_old";
