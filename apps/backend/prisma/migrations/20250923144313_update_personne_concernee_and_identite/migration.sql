/*
  Warnings:

  - You are about to drop the column `civiliteId` on the `PersonneConcernee` table. All the data in the column will be lost.
  - You are about to drop the column `telephone` on the `PersonneConcernee` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."PersonneConcernee" DROP CONSTRAINT "PersonneConcernee_civiliteId_fkey";

-- AlterTable
ALTER TABLE "public"."Identite" ADD COLUMN     "civiliteId" TEXT;

-- AlterTable
ALTER TABLE "public"."PersonneConcernee" DROP COLUMN "civiliteId",
DROP COLUMN "telephone";

-- AddForeignKey
ALTER TABLE "public"."Identite" ADD CONSTRAINT "Identite_civiliteId_fkey" FOREIGN KEY ("civiliteId") REFERENCES "public"."CiviliteEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;
