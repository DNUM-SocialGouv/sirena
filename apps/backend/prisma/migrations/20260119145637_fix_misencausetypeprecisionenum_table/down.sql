-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- DropForeignKey
ALTER TABLE "public"."MisEnCause" DROP CONSTRAINT "MisEnCause_misEnCauseTypeId_misEnCauseTypePrecisionId_fkey";

-- AlterTable
ALTER TABLE "public"."MisEnCauseTypePrecisionEnum" DROP CONSTRAINT "MisEnCauseTypePrecisionEnum_pkey",
ADD CONSTRAINT "MisEnCauseTypePrecisionEnum_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "MisEnCauseTypePrecisionEnum_label_key" ON "public"."MisEnCauseTypePrecisionEnum"("label" ASC);

-- AddForeignKey
ALTER TABLE "public"."MisEnCause" ADD CONSTRAINT "MisEnCause_misEnCauseTypePrecisionId_fkey" FOREIGN KEY ("misEnCauseTypePrecisionId") REFERENCES "public"."MisEnCauseTypePrecisionEnum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

