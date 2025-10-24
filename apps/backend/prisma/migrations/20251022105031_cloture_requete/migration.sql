-- AlterTable
ALTER TABLE "public"."RequeteEtape" ADD COLUMN     "clotureReasonId" TEXT;

-- CreateTable
CREATE TABLE "public"."RequeteClotureReasonEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RequeteClotureReasonEnum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequeteClotureReasonEnum_label_key" ON "public"."RequeteClotureReasonEnum"("label");

-- AddForeignKey
ALTER TABLE "public"."RequeteEtape" ADD CONSTRAINT "RequeteEtape_clotureReasonId_fkey" FOREIGN KEY ("clotureReasonId") REFERENCES "public"."RequeteClotureReasonEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
