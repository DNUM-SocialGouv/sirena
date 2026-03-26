-- AlterTable
ALTER TABLE "public"."RequeteEntite"
  DROP CONSTRAINT IF EXISTS "RequeteEntite_statutId_fkey";

-- AlterTable
ALTER TABLE "public"."RequeteEntite"
  DROP COLUMN IF EXISTS "statutId";

-- DropTable
DROP TABLE IF EXISTS "public"."RequeteStatusEnum";