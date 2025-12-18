-- Partial index to speed up queries on ChangeLog where after.isFallback = true

DROP INDEX IF EXISTS changelog_isfallback_true_idx;