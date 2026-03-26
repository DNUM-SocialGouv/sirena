
-- CreateTable
CREATE TABLE "_RequeteClotureReasonEnumToRequeteEtape" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RequeteClotureReasonEnumToRequeteEtape_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RequeteClotureReasonEnumToRequeteEtape_B_index" ON "_RequeteClotureReasonEnumToRequeteEtape"("B");

-- AddForeignKey
ALTER TABLE "_RequeteClotureReasonEnumToRequeteEtape" ADD CONSTRAINT "_RequeteClotureReasonEnumToRequeteEtape_A_fkey" FOREIGN KEY ("A") REFERENCES "RequeteClotureReasonEnum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RequeteClotureReasonEnumToRequeteEtape" ADD CONSTRAINT "_RequeteClotureReasonEnumToRequeteEtape_B_fkey" FOREIGN KEY ("B") REFERENCES "RequeteEtape"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing single-value data into the new join table
INSERT INTO "_RequeteClotureReasonEnumToRequeteEtape" ("A", "B")
SELECT "clotureReasonId", "id"
FROM "RequeteEtape"
WHERE "clotureReasonId" IS NOT NULL
ON CONFLICT ("A", "B") DO NOTHING;

-- DropForeignKey
ALTER TABLE "RequeteEtape" DROP CONSTRAINT IF EXISTS "RequeteEtape_clotureReasonId_fkey";

-- AlterTable
ALTER TABLE "RequeteEtape" DROP COLUMN IF EXISTS "clotureReasonId";
