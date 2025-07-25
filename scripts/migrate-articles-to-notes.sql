-- Migration: Copy articles to notes table (avoiding duplicates)
-- This allows iOS shortcut to work with both main and feature branches

INSERT INTO notes (
  id,
  "userId", 
  url,
  title,
  domain,
  content,
  annotation,
  tag,
  state,
  "createdAt",
  "updatedAt"
)
SELECT 
  articles.id,
  articles."userId",
  articles.url,
  articles.title,
  articles.domain,
  articles.content,
  NULL as annotation,  -- Articles don't have annotations
  articles.tag,
  'inbox' as state,    -- All migrated articles go to inbox
  articles."createdAt",
  articles."updatedAt"
FROM articles
WHERE articles.id NOT IN (
  SELECT id FROM notes WHERE notes.id = articles.id
)
AND articles."userId" IS NOT NULL;

-- Verify migration results
SELECT 
  'articles' as source_table, 
  COUNT(*) as record_count 
FROM articles
UNION ALL
SELECT 
  'notes' as source_table, 
  COUNT(*) as record_count 
FROM notes
UNION ALL
SELECT 
  'migrated_articles' as source_table,
  COUNT(*) as record_count
FROM notes 
WHERE annotation IS NULL 
AND state = 'inbox';