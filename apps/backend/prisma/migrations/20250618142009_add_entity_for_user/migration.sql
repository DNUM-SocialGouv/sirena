-- AlterTable
ALTER TABLE "User" ADD COLUMN     "entiteId" TEXT;

-- CreateTable
CREATE TABLE "entite" (
    "id" TEXT NOT NULL,
    "nomComplet" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "email" TEXT,
    "EntiteMereId" TEXT,

    CONSTRAINT "entite_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entite" ADD CONSTRAINT "entite_EntiteMereId_fkey" FOREIGN KEY ("EntiteMereId") REFERENCES "entite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
