ALTER TABLE "RequeteEtape" ADD COLUMN "createdById" TEXT;

ALTER TABLE "RequeteEtape" 
  ADD CONSTRAINT "RequeteEtape_createdById_fkey" 
  FOREIGN KEY ("createdById") 
  REFERENCES "User"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
