CREATE TYPE "ReponseOuiNon" AS ENUM ('OUI', 'NON', 'NON_RENSEIGNE');
ALTER TYPE "MesureProtection" ADD VALUE 'NON_RENSEIGNE';

ALTER TABLE "PersonneConcernee"
  ALTER COLUMN "estHandicapee" TYPE "ReponseOuiNon"
    USING CASE "estHandicapee"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END,
  ALTER COLUMN "estVictimeInformee" TYPE "ReponseOuiNon"
    USING CASE "estVictimeInformee"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END,
  ALTER COLUMN "veutGarderAnonymat" TYPE "ReponseOuiNon"
    USING CASE "veutGarderAnonymat"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END,
  ALTER COLUMN "estSignalementProfessionnel" TYPE "ReponseOuiNon"
    USING CASE "estSignalementProfessionnel"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END,
  ALTER COLUMN "aAutrePersonnes" TYPE "ReponseOuiNon"
    USING CASE "aAutrePersonnes"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END;

ALTER TABLE "Situation"
  ALTER COLUMN "estLieAuSignalement" TYPE "ReponseOuiNon"
    USING CASE "estLieAuSignalement"
      WHEN true THEN 'OUI'::"ReponseOuiNon"
      WHEN false THEN 'NON'::"ReponseOuiNon"
    END;
