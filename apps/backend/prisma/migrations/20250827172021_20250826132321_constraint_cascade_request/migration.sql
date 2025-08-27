-- DropForeignKey
ALTER TABLE "public"."Declarant" DROP CONSTRAINT "Declarant_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DemarchesEngagees" DROP CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaits" DROP CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" DROP CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" DROP CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" DROP CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InfoComplementaire" DROP CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LieuIncident" DROP CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MisEnCause" DROP CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RequeteStateNote" DROP CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedFile" DROP CONSTRAINT "UploadedFile_requeteStateNoteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Victime" DROP CONSTRAINT "Victime_requeteEntiteStateId_fkey";

-- AddForeignKey
ALTER TABLE "public"."RequeteStateNote" ADD CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Victime" ADD CONSTRAINT "Victime_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Declarant" ADD CONSTRAINT "Declarant_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaits" ADD CONSTRAINT "DescriptionFaits_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMotif" ADD CONSTRAINT "DescriptionFaitsMotif_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsConsequence" ADD CONSTRAINT "DescriptionFaitsConsequence_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DescriptionFaitsMaltraitanceType" ADD CONSTRAINT "DescriptionFaitsMaltraitanceType_faitsId_fkey" FOREIGN KEY ("faitsId") REFERENCES "public"."DescriptionFaits"("requeteEntiteStateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LieuIncident" ADD CONSTRAINT "LieuIncident_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MisEnCause" ADD CONSTRAINT "MisEnCause_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DemarchesEngagees" ADD CONSTRAINT "DemarchesEngagees_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfoComplementaire" ADD CONSTRAINT "InfoComplementaire_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "public"."RequeteState"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedFile" ADD CONSTRAINT "UploadedFile_requeteStateNoteId_fkey" FOREIGN KEY ("requeteStateNoteId") REFERENCES "public"."RequeteStateNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
