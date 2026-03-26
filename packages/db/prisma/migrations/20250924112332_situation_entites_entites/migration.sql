-- CreateTable
CREATE TABLE "public"."SituationEntite" (
    "situationId" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,

    CONSTRAINT "SituationEntite_pkey" PRIMARY KEY ("situationId","entiteId")
);

-- AddForeignKey
ALTER TABLE "public"."SituationEntite" ADD CONSTRAINT "SituationEntite_situationId_fkey" FOREIGN KEY ("situationId") REFERENCES "public"."Situation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SituationEntite" ADD CONSTRAINT "SituationEntite_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "public"."Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
