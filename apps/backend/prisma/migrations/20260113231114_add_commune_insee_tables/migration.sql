-- CreateTable
CREATE TABLE "Commune" (
    "comCode" TEXT NOT NULL,
    "comLib" TEXT NOT NULL,
    "metomerLib" TEXT NOT NULL,
    "ctcdCodeActuel" TEXT NOT NULL,
    "ctcdLibActuel" TEXT NOT NULL,
    "dptCodeActuel" TEXT NOT NULL,
    "dptLibActuel" TEXT NOT NULL,
    "regCodeActuel" TEXT NOT NULL,
    "regLibActuel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("comCode")
);

-- CreateTable
CREATE TABLE "InseePostal" (
    "id" TEXT NOT NULL,
    "codeInsee" TEXT NOT NULL,
    "nomCommune" TEXT NOT NULL,
    "codePostal" TEXT NOT NULL,
    "libelleAcheminement" TEXT,
    "ligne5" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InseePostal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Commune_dptCodeActuel_idx" ON "Commune"("dptCodeActuel");

-- CreateIndex
CREATE INDEX "Commune_regCodeActuel_idx" ON "Commune"("regCodeActuel");

-- CreateIndex
CREATE INDEX "Commune_ctcdCodeActuel_idx" ON "Commune"("ctcdCodeActuel");

-- CreateIndex
CREATE INDEX "InseePostal_codeInsee_idx" ON "InseePostal"("codeInsee");

-- CreateIndex
CREATE INDEX "InseePostal_codePostal_idx" ON "InseePostal"("codePostal");

-- CreateIndex
CREATE UNIQUE INDEX "InseePostal_codeInsee_codePostal_key" ON "InseePostal"("codeInsee", "codePostal");

-- AddForeignKey
ALTER TABLE "InseePostal" ADD CONSTRAINT "InseePostal_codeInsee_fkey" FOREIGN KEY ("codeInsee") REFERENCES "Commune"("comCode") ON DELETE RESTRICT ON UPDATE CASCADE;
