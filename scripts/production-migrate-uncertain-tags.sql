-- Production database migration script
-- Run this after deploying the new code to production
-- This will eliminate all "uncertain" tags using the new binary classification system

-- Step 1: Get count of uncertain articles before migration
SELECT 'Before migration - uncertain articles:' as status, COUNT(*) as count 
FROM notes WHERE tag = 'uncertain';

-- Step 2: Update articles that should be classified as 'work'
-- (These will be handled by the binary classification logic)
UPDATE notes 
SET tag = '', updated_at = NOW() 
WHERE tag = 'uncertain';

-- Step 3: Verify migration results
SELECT 'After migration - uncertain articles:' as status, COUNT(*) as count 
FROM notes WHERE tag = 'uncertain';

SELECT 'After migration - untagged articles:' as status, COUNT(*) as count 
FROM notes WHERE tag = '';

-- Step 4: Show final tag distribution
SELECT tag, COUNT(*) as count 
FROM notes 
GROUP BY tag 
ORDER BY count DESC;