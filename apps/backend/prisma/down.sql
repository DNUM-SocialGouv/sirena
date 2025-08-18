-- DropForeignKey
ALTER TABLE "RequeteStateNote" DROP CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteStateNote" DROP CONSTRAINT "RequeteStateNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeLog" DROP CONSTRAINT "ChangeLog_changedById_fkey";

-- DropTable
DROP TABLE "RequeteStateNote";

-- DropTable
DROP TABLE "ChangeLog";

