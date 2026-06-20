-- Remove the "En cours" step status: affected steps become null (irreversible).
UPDATE "RequeteEtape" SET "statutId" = NULL WHERE "statutId" = 'EN_COURS';
