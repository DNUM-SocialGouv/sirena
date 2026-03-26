-- RemoveForeignKey
ALTER TABLE "Requete" DROP CONSTRAINT IF EXISTS "Requete_thirdPartyAccountId_fkey";

-- DropColumn
ALTER TABLE "Requete" DROP COLUMN IF EXISTS "thirdPartyAccountId";
