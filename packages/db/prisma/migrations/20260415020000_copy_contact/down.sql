UPDATE "public"."Entite"
SET "emailContactUsager" = ''
WHERE "regionCode" IN ('11', '76')
  AND "entiteMereId" IS NULL
  AND "emailContactUsager" = "email"
  AND "telContactUsager" = ''
  AND "adresseContactUsager" = '';
