-- CreateTable
CREATE TABLE "DematSocialMapping" (
    "id" TEXT NOT NULL,
    "dematSocialId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DematSocialMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DematSocialMapping_dematSocialId_key" ON "DematSocialMapping"("dematSocialId");
