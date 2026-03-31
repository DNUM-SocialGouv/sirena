-- AlterTable
ALTER TABLE "RequeteEtape" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'MANUAL';

-- Backfill existing steps based on name patterns
UPDATE "RequeteEtape" SET "type" = 'CREATION'
WHERE "nom" LIKE 'Création de la requête le%'
   OR "nom" LIKE 'Création automatique de la requête le%';

UPDATE "RequeteEtape" SET "type" = 'ACKNOWLEDGMENT'
WHERE "nom" = 'Envoyer un accusé de réception au déclarant';

UPDATE "RequeteEtape" SET "type" = 'REOPEN'
WHERE "nom" LIKE 'Requête rouverte le%';
