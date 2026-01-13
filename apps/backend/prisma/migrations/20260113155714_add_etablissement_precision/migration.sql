INSERT INTO "MisEnCauseTypeEnum" ("id", "label")
VALUES ('ETABLISSEMENT', 'Etablissement ou service')
ON CONFLICT DO NOTHING;

INSERT INTO "MisEnCauseTypePrecisionEnum" ("id", "label", "misEnCauseTypeId")
VALUES
  ('ETABLISSEMENT', 'Etablissement où se sont déroulés les faits', 'ETABLISSEMENT'),
  ('SERVICE', 'Services de soins infirmiers ou d''aide à domicile (SAAD, SSIAD, SPASAD)', 'ETABLISSEMENT'),
  ('SAMSAH', 'SAMSAH', 'ETABLISSEMENT'),
  ('SAVS', 'SAVS (Service d''accompagnement à la vie sociale)', 'ETABLISSEMENT'),
  ('SESSAD', 'SESSAD (Service d''Education Spéciale et de Soins à Domicile) non rattaché à un établissement', 'ETABLISSEMENT'),
  ('SPST', 'SPST', 'ETABLISSEMENT'),
  ('SAEMO', 'SAEMO (services d''action éducative en milieu ouvert)', 'ETABLISSEMENT'),
  ('SAED', 'SAED (Services d''action éducative à domicile)', 'ETABLISSEMENT'),
  ('AUTRE', 'Autre', 'ETABLISSEMENT')
ON CONFLICT DO NOTHING;
