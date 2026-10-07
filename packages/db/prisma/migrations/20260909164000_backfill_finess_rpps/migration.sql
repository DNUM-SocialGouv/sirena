-- SIRENA-772: replace the prefixed IDNST value with the 9-digit FINESS number.
UPDATE "LieuDeSurvenue"
SET "finess" = SUBSTRING("finess" FROM 2)
WHERE "finess" ~ '^1[0-9]{9}$';

-- The same incorrect organization identifier can be stored on an implicated establishment or service.
UPDATE "MisEnCause"
SET "finess" = SUBSTRING("finess" FROM 2)
WHERE "finess" ~ '^1[0-9]{9}$';

-- Replace the prefixed IDNPS value with the 11-digit RPPS number.
UPDATE "MisEnCause"
SET "rpps" = SUBSTRING("rpps" FROM 2)
WHERE "rpps" ~ '^81[0-9]{10}$';
