-- CreateTable
CREATE TABLE "public"."RequeteStatusEnum" (
    "id"    TEXT PRIMARY KEY,
    "label" TEXT NOT NULL
);

-- SeedData
INSERT INTO "public"."RequeteStatusEnum" ("id", "label") VALUES
    ('NOUVEAU',  'Nouveau'),
    ('EN_COURS', 'En cours'),
    ('CLOTUREE', 'Clôturée');

-- AlterTable
ALTER TABLE "public"."RequeteEntite"
    ADD COLUMN "statutId" TEXT NOT NULL DEFAULT 'EN_COURS';

-- AlterTable
ALTER TABLE "public"."RequeteEntite"
    ADD CONSTRAINT "RequeteEntite_statutId_fkey"
    FOREIGN KEY ("statutId")
    REFERENCES "public"."RequeteStatusEnum"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

