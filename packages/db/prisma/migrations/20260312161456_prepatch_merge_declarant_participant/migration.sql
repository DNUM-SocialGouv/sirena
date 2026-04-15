-- Pre-patch before migration 20260312161457_merge_declarant_participant_est_victime

UPDATE "PersonneConcernee"
SET "estVictime" = NULL
WHERE id IN (
  'e70e75c7-b22c-4460-b668-6eabe7d51572', -- RT228
  'f9c9f5db-6d8e-4d14-a366-bce7182527da', -- RT171
  '7fd96d1c-d50d-4b55-bdd3-d6557fbe893b', -- RT53
  '7da7535d-899f-4755-a394-2a5f8469a460', -- RT121
  '99f4048c-e6fe-4336-806f-d733a91f83b2', -- RT124
  '17661cd8-f933-4fe1-abb4-e5eee6de4c93', -- RT152
  'b10c0fe1-b949-46fa-b1df-fd3ededf4d63'  -- RT203
);

-- ============================================================
-- STEP 2 : Concatenate diverging commentaires from #A into #B
-- ============================================================

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '3c96b67d-ddc1-485c-ab04-56fd1b8018b7')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '3c96b67d-ddc1-485c-ab04-56fd1b8018b7')
         || E'\n---\n' || commentaire
  END
WHERE id = '411f45be-70be-4edc-b640-bc99054d8c5f' -- #B RT11
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '3c96b67d-ddc1-485c-ab04-56fd1b8018b7' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '60a106ea-0a32-4c34-971a-d535bc0bbb60')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '60a106ea-0a32-4c34-971a-d535bc0bbb60')
         || E'\n---\n' || commentaire
  END
WHERE id = '5bfe0c07-82a5-49d3-8502-6e284919dde8' -- #B RT22
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '60a106ea-0a32-4c34-971a-d535bc0bbb60' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '88f1b09f-420d-4df7-953c-1c2f66b9cdb9')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '88f1b09f-420d-4df7-953c-1c2f66b9cdb9')
         || E'\n---\n' || commentaire
  END
WHERE id = '600e451d-22b1-4b31-9f5b-7b2f638ad5ce' -- #B RT36
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '88f1b09f-420d-4df7-953c-1c2f66b9cdb9' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'ce1bcbdf-e891-4439-a31c-e4b6b0b87b3d')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'ce1bcbdf-e891-4439-a31c-e4b6b0b87b3d')
         || E'\n---\n' || commentaire
  END
WHERE id = '2a26b2b2-e2b4-4140-b401-fc6206d6888f' -- #B RT88
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = 'ce1bcbdf-e891-4439-a31c-e4b6b0b87b3d' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '71d218a9-7730-49b8-9c05-38cc951a3ae4')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '71d218a9-7730-49b8-9c05-38cc951a3ae4')
         || E'\n---\n' || commentaire
  END
WHERE id = 'c1264ecd-3583-45f7-b177-3bed2efc1e17' -- #B RT151
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '71d218a9-7730-49b8-9c05-38cc951a3ae4' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '1588fa75-8141-42d9-9b75-fa62b02955fa')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '1588fa75-8141-42d9-9b75-fa62b02955fa')
         || E'\n---\n' || commentaire
  END
WHERE id = 'b460f182-97bd-4361-a993-fea0dcf3ad1b' -- #B RT158
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '1588fa75-8141-42d9-9b75-fa62b02955fa' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '5b9a2c30-9a8c-4839-8fe4-80922caaa4b2')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '5b9a2c30-9a8c-4839-8fe4-80922caaa4b2')
         || E'\n---\n' || commentaire
  END
WHERE id = '58e0c3ba-23ec-45fd-8901-1471a64c56ca' -- #B RT192
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '5b9a2c30-9a8c-4839-8fe4-80922caaa4b2' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'f2e595f6-3abe-458a-b80e-af8827aeb238')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'f2e595f6-3abe-458a-b80e-af8827aeb238')
         || E'\n---\n' || commentaire
  END
WHERE id = '4a81d233-4e70-4839-959e-1d68a25585ed' -- #B RT196
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = 'f2e595f6-3abe-458a-b80e-af8827aeb238' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '4340db6a-5672-487c-ab24-5c05289d2eaa')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '4340db6a-5672-487c-ab24-5c05289d2eaa')
         || E'\n---\n' || commentaire
  END
WHERE id = 'ffa65278-3e17-4551-b2b3-221535729a66' -- #B RT197
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '4340db6a-5672-487c-ab24-5c05289d2eaa' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '20f8925b-3ebb-4350-9d64-a1a8bd49fd60')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '20f8925b-3ebb-4350-9d64-a1a8bd49fd60')
         || E'\n---\n' || commentaire
  END
WHERE id = '50c05f7d-3e2a-4edf-8477-2a1755a0f175' -- #B RT211
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '20f8925b-3ebb-4350-9d64-a1a8bd49fd60' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '46bfd800-3520-49fb-934d-e440fac279b2')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '46bfd800-3520-49fb-934d-e440fac279b2')
         || E'\n---\n' || commentaire
  END
WHERE id = 'c77c78de-4962-4435-a44f-00c5984aa8a6' -- #B RT218
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '46bfd800-3520-49fb-934d-e440fac279b2' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'b8c95ecb-8243-4966-ac28-e16ab32eda2f')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'b8c95ecb-8243-4966-ac28-e16ab32eda2f')
         || E'\n---\n' || commentaire
  END
WHERE id = '674d119c-582d-47f1-b051-a561dda05d1f' -- #B RT219
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = 'b8c95ecb-8243-4966-ac28-e16ab32eda2f' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '13d81b83-e794-4d22-8b84-b58fc2192ba2')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '13d81b83-e794-4d22-8b84-b58fc2192ba2')
         || E'\n---\n' || commentaire
  END
WHERE id = 'f1cc9b45-0b37-4922-9007-fd0819942866' -- #B RT221
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '13d81b83-e794-4d22-8b84-b58fc2192ba2' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'f44a401e-2f9d-4f8d-9b4f-b903e94baaa8')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = 'f44a401e-2f9d-4f8d-9b4f-b903e94baaa8')
         || E'\n---\n' || commentaire
  END
WHERE id = '6ca9a333-824f-46d3-84b9-4b7b91532ff3' -- #B RT224
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = 'f44a401e-2f9d-4f8d-9b4f-b903e94baaa8' AND commentaire != '');

UPDATE "PersonneConcernee" SET commentaire =
  CASE
    WHEN commentaire = '' THEN (SELECT commentaire FROM "PersonneConcernee" WHERE id = '93ac9e98-83b2-449d-a3b8-f1b7ace5c4ae')
    ELSE (SELECT commentaire FROM "PersonneConcernee" WHERE id = '93ac9e98-83b2-449d-a3b8-f1b7ace5c4ae')
         || E'\n---\n' || commentaire
  END
WHERE id = '5d64dd74-ad83-4654-88e7-afec61497b99' -- #B RT226
  AND EXISTS (SELECT 1 FROM "PersonneConcernee" WHERE id = '93ac9e98-83b2-449d-a3b8-f1b7ace5c4ae' AND commentaire != '');
