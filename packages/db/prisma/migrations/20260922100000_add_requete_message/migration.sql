-- CreateTable
CREATE TABLE "RequeteMessage" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "requeteId" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequeteMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequeteMessageRead" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entiteId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequeteMessageRead_pkey" PRIMARY KEY ("messageId","userId")
);

-- CreateIndex
CREATE INDEX "RequeteMessage_requeteId_createdAt_id_idx" ON "RequeteMessage"("requeteId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "RequeteMessage_entiteId_idx" ON "RequeteMessage"("entiteId");

-- CreateIndex
CREATE INDEX "RequeteMessageRead_userId_idx" ON "RequeteMessageRead"("userId");

-- CreateIndex
CREATE INDEX "RequeteMessageRead_messageId_entiteId_idx" ON "RequeteMessageRead"("messageId", "entiteId");

-- AddForeignKey
ALTER TABLE "RequeteMessage" ADD CONSTRAINT "RequeteMessage_requeteId_fkey" FOREIGN KEY ("requeteId") REFERENCES "Requete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteMessage" ADD CONSTRAINT "RequeteMessage_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteMessage" ADD CONSTRAINT "RequeteMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteMessageRead" ADD CONSTRAINT "RequeteMessageRead_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "RequeteMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteMessageRead" ADD CONSTRAINT "RequeteMessageRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteMessageRead" ADD CONSTRAINT "RequeteMessageRead_entiteId_fkey" FOREIGN KEY ("entiteId") REFERENCES "Entite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

