-- Rollback: restore previous nomComplet
UPDATE "Entite"
SET "nomComplet" = 'Pôle Solidarités actives et délégation départementale aux droits des femmes et à l''égalité'
WHERE id = 'f72855ca-db08-4321-aae8-e45bc195e5d1';
