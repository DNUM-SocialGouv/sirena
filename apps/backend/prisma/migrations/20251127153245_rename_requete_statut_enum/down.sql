ALTER TABLE "public"."RequeteEtapeStatutEnum"
RENAME TO "RequeteStatutEnum";

ALTER TABLE "public"."RequeteStatutEnum"
RENAME CONSTRAINT "RequeteEtapeStatutEnum_pkey" TO "RequeteStatutEnum_pkey";