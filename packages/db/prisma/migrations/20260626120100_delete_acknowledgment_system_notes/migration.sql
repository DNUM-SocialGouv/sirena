-- delete the legacy ACR (accusé de réception) system notes.
DELETE FROM "RequeteEtapeNote"
WHERE "texte" LIKE 'Email d''accusé de réception envoyé le%';
