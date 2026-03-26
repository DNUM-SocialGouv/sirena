-- AlterTable
ALTER TABLE "RequeteEntite" ADD COLUMN     "prioriteId" TEXT;

-- CreateTable
CREATE TABLE "RequetePrioriteEnum" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "RequetePrioriteEnum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequetePrioriteEnum_label_key" ON "RequetePrioriteEnum"("label");

-- AddForeignKey
ALTER TABLE "RequeteEntite" ADD CONSTRAINT "RequeteEntite_prioriteId_fkey" FOREIGN KEY ("prioriteId") REFERENCES "RequetePrioriteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
