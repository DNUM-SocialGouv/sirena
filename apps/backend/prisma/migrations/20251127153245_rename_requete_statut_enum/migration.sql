ALTER TABLE "public"."RequeteStatutEnum"
RENAME TO "RequeteEtapeStatutEnum";

ALTER TABLE "public"."RequeteEtapeStatutEnum"
RENAME CONSTRAINT "RequeteStatutEnum_pkey" TO "RequeteEtapeStatutEnum_pkey";