UPDATE "public"."Entite"
SET "emailDomain" = '@' || "emailDomain"
WHERE "emailDomain" IS NOT NULL
  AND "emailDomain" != ''
  AND "emailDomain" NOT LIKE '@%';
