-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_accountId_fkey";

-- DropIndex
DROP INDEX "ApiKey_keyHash_idx";

-- DropIndex
DROP INDEX "ApiKey_status_idx";

-- DropIndex
DROP INDEX "ApiKey_accountId_idx";

-- DropIndex
DROP INDEX "ApiKey_keyHash_key";

-- DropIndex
DROP INDEX "ThirdPartyAccount_name_key";

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "ThirdPartyAccount";

-- DropEnum
DROP TYPE "ApiKeyStatus";
