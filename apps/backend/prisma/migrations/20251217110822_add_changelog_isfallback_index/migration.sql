-- Partial index to speed up queries on ChangeLog where after.isFallback = true

CREATE INDEX IF NOT EXISTS changelog_isfallback_true_idx
ON "ChangeLog" ("changedAt")
WHERE ("after"->>'isFallback') = 'true';