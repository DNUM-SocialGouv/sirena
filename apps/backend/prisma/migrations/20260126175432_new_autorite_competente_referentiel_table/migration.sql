-- CreateTable
CREATE TABLE "AutoriteCompetenteReferentiel" (
    "id" TEXT NOT NULL,
    "categCode" TEXT NOT NULL,
    "categLib" TEXT,
    "entiteTypeIds" TEXT[],
    "sourceFileVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoriteCompetenteReferentiel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutoriteCompetenteReferentiel_categCode_key" ON "AutoriteCompetenteReferentiel"("categCode");
