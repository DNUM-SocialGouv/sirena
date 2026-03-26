-- CreateTable
CREATE TABLE "RequeteStateNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requeteEntiteStateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "RequeteStateNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RequeteStateNote" ADD CONSTRAINT "RequeteStateNote_requeteEntiteStateId_fkey" FOREIGN KEY ("requeteEntiteStateId") REFERENCES "RequeteState"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequeteStateNote" ADD CONSTRAINT "RequeteStateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
