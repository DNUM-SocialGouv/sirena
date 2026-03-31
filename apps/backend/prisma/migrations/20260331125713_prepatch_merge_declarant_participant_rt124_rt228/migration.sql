UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '99f4048c-e6fe-4336-806f-d733a91f83b2')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '99f4048c-e6fe-4336-806f-d733a91f83b2')
         || E'\n---\n' || commentaire
  END
WHERE id = '72686789-e4e0-41b1-a355-aa0da14dca5d' -- #B RT124
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '99f4048c-e6fe-4336-806f-d733a91f83b2' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'e70e75c7-b22c-4460-b668-6eabe7d51572')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'e70e75c7-b22c-4460-b668-6eabe7d51572')
         || E'\n---\n' || commentaire
  END
WHERE id = '643ca1ca-87c1-4e6f-ba82-6d2131782f7b' -- #B RT228
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = 'e70e75c7-b22c-4460-b668-6eabe7d51572' AND commentaire != '');
