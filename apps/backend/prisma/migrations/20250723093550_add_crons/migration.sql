-- CreateTable
CREATE TABLE "Crons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "params" JSONB,
    "result" JSONB,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Crons_pkey" PRIMARY KEY ("id")
);
