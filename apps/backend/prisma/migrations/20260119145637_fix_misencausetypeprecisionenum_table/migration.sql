/*
  Warnings:

  - The primary key for the `MisEnCauseTypePrecisionEnum` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "MisEnCause" DROP CONSTRAINT "MisEnCause_misEnCauseTypePrecisionId_fkey";

-- DropIndex
DROP INDEX "MisEnCauseTypePrecisionEnum_label_key";

-- AlterTable
ALTER TABLE "MisEnCauseTypePrecisionEnum" DROP CONSTRAINT "MisEnCauseTypePrecisionEnum_pkey",
ADD CONSTRAINT "MisEnCauseTypePrecisionEnum_pkey" PRIMARY KEY ("misEnCauseTypeId", "id");

-- AddForeignKey
ALTER TABLE "MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCauseTypeId_misEnCauseTypePrecisionId_fkey" FOREIGN KEY ("misEnCauseTypeId", "misEnCauseTypePrecisionId") REFERENCES "MisEnCauseTypePrecisionEnum"("misEnCauseTypeId", "id") ON DELETE SET NULL ON UPDATE CASCADE;
