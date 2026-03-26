-- DropForeignKey
ALTER TABLE "public"."RequeteEtapeNote" DROP CONSTRAINT "RequeteEtapeNote_authorId_fkey";

-- AlterTable
ALTER TABLE "public"."RequeteEtapeNote" ALTER COLUMN "authorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."RequeteEtapeNote" ADD CONSTRAINT "RequeteEtapeNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

