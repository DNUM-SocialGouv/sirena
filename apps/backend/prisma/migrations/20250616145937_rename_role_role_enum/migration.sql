-- AlterTable
ALTER TABLE IF EXISTS "Role" RENAME TO "RoleEnum";

ALTER TABLE "RoleEnum" RENAME CONSTRAINT "Role_pkey" TO "RoleEnum_pkey";

-- RenameIndex
ALTER INDEX "Role_roleName_key" RENAME TO "RoleEnum_roleName_key";
