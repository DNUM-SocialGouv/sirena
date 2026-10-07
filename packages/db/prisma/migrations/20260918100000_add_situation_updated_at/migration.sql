-- The default only backfills existing rows: `@updatedAt` is written by the Prisma client,
-- so keeping it would show up as drift in later `prisma migrate diff` runs.

-- AlterTable
ALTER TABLE "Situation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Situation" ALTER COLUMN "updatedAt" DROP DEFAULT;
