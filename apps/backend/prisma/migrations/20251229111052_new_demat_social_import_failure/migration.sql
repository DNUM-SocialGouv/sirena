-- CreateTable
CREATE TABLE "DematSocialImportFailure" (
    "id" TEXT NOT NULL,
    "dematSocialId" INTEGER NOT NULL,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "errorContext" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastRetryAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedRequeteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DematSocialImportFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DematSocialImportFailure_dematSocialId_key" ON "DematSocialImportFailure"("dematSocialId");

-- CreateIndex
CREATE INDEX "DematSocialImportFailure_dematSocialId_idx" ON "DematSocialImportFailure"("dematSocialId");

-- CreateIndex
CREATE INDEX "DematSocialImportFailure_errorType_idx" ON "DematSocialImportFailure"("errorType");

-- CreateIndex
CREATE INDEX "DematSocialImportFailure_resolvedAt_idx" ON "DematSocialImportFailure"("resolvedAt");
