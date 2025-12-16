-- DropForeignKey
ALTER TABLE "ChangeLog" DROP CONSTRAINT "ChangeLog_changedById_fkey";

-- AlterTable
ALTER TABLE "ChangeLog" ALTER COLUMN "changedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ChangeLog" ADD CONSTRAINT "ChangeLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
