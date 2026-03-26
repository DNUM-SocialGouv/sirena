-- AlterTable
ALTER TABLE "Requete" DROP COLUMN "number",
ALTER COLUMN "dematSocialId" SET NOT NULL,
ALTER COLUMN "dematSocialId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RequeteEntite" ALTER COLUMN "number" DROP DEFAULT,
ALTER COLUMN "number" SET DATA TYPE TEXT;
DROP SEQUENCE "";

-- CreateIndex
CREATE UNIQUE INDEX "Requete_dematSocialId_key" ON "Requete"("dematSocialId" ASC);

