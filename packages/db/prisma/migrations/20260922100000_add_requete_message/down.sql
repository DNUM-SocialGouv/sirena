-- DropForeignKey
ALTER TABLE "RequeteMessage" DROP CONSTRAINT "RequeteMessage_requeteId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteMessage" DROP CONSTRAINT "RequeteMessage_entiteId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteMessage" DROP CONSTRAINT "RequeteMessage_authorId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteMessageRead" DROP CONSTRAINT "RequeteMessageRead_messageId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteMessageRead" DROP CONSTRAINT "RequeteMessageRead_userId_fkey";

-- DropForeignKey
ALTER TABLE "RequeteMessageRead" DROP CONSTRAINT "RequeteMessageRead_entiteId_fkey";

-- DropTable
DROP TABLE "RequeteMessage";

-- DropTable
DROP TABLE "RequeteMessageRead";

