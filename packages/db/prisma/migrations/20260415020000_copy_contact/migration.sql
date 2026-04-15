UPDATE "public"."Entite"
SET "emailContactUsager" = "email"
WHERE "regionCode" IN ('11', '76')
  AND "entiteMereId" IS NULL
  AND "emailContactUsager" = ''
  AND "telContactUsager" = ''
  AND "adresseContactUsager" = '';
