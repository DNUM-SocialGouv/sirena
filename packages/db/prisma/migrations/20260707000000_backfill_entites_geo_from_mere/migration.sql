UPDATE "Entite" e SET
  "regionCode"      = COALESCE(e."regionCode",      m."regionCode"),
  "regLib"          = COALESCE(e."regLib",          m."regLib"),
  "ctcdCode"        = COALESCE(e."ctcdCode",        m."ctcdCode"),
  "departementCode" = COALESCE(e."departementCode", m."departementCode"),
  "dptLib"          = COALESCE(e."dptLib",          m."dptLib")
FROM "Entite" m
WHERE e."entiteMereId" = m.id;

UPDATE "Entite" e SET
  "regionCode"      = COALESCE(e."regionCode",      m."regionCode"),
  "regLib"          = COALESCE(e."regLib",          m."regLib"),
  "ctcdCode"        = COALESCE(e."ctcdCode",        m."ctcdCode"),
  "departementCode" = COALESCE(e."departementCode", m."departementCode"),
  "dptLib"          = COALESCE(e."dptLib",          m."dptLib")
FROM "Entite" m
WHERE e."entiteMereId" = m.id;

UPDATE "Entite" e SET
  "regionCode"      = COALESCE(e."regionCode",      m."regionCode"),
  "regLib"          = COALESCE(e."regLib",          m."regLib"),
  "ctcdCode"        = COALESCE(e."ctcdCode",        m."ctcdCode"),
  "departementCode" = COALESCE(e."departementCode", m."departementCode"),
  "dptLib"          = COALESCE(e."dptLib",          m."dptLib")
FROM "Entite" m
WHERE e."entiteMereId" = m.id;
