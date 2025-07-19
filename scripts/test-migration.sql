-- Test Script: Verify Migration Success
-- Run this after migration to ensure data integrity

-- Check that all articles were migrated
SELECT 
  'Data Integrity Check' as test_name,
  (SELECT COUNT(*) FROM articles) as articles_count,
  (SELECT COUNT(*) FROM notes WHERE state = 'saved') as saved_notes_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM articles) = (SELECT COUNT(*) FROM notes WHERE state = 'saved')
    THEN 'PASS: All articles migrated'
    ELSE 'FAIL: Migration incomplete'
  END as result;

-- Verify schema changes
SELECT 
  'Schema Verification' as test_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'notes' 
ORDER BY ordinal_position;

-- Test sample data
SELECT 
  'Sample Data Check' as test_name,
  id,
  title,
  state,
  annotation IS NULL as no_annotation,
  created_at,
  updated_at
FROM notes 
LIMIT 5;