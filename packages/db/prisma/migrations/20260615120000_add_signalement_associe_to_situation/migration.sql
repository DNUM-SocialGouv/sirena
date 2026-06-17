-- AlterTable
ALTER TABLE "Situation" ADD COLUMN "estLieAuSignalement" BOOLEAN;
ALTER TABLE "Situation" ADD COLUMN "numerosSignalement" TEXT NOT NULL DEFAULT '';
