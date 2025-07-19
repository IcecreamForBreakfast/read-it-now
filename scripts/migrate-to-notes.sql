-- Migration Script: Transform Articles to Notes Schema
-- This script safely migrates existing articles table to the new notes schema
-- Run this on the unified-notes branch deployment only

BEGIN;

-- Step 1: Create the new notes table with extended schema
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT,  -- Made optional for manual notes
  title TEXT NOT NULL,
  domain TEXT,  -- Made optional for manual notes
  content TEXT,
  annotation TEXT,  -- New field for user annotations
  tag TEXT NOT NULL DEFAULT 'untagged',
  state TEXT NOT NULL DEFAULT 'inbox',  -- New field: inbox | saved | archived
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 2: Copy existing articles to notes table with state mapping
-- All existing articles are considered "saved" (reference-worthy)
INSERT INTO notes (
  id, user_id, url, title, domain, content, tag, state, created_at, updated_at
)
SELECT 
  id,
  user_id,
  url,
  title,
  domain,
  content,
  tag,
  'saved' as state,  -- Existing articles are treated as saved references
  saved_at as created_at,
  saved_at as updated_at  -- Set updated_at to same as created_at initially
FROM articles
ON CONFLICT (id) DO NOTHING;  -- Prevent duplicates if run multiple times

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_state ON notes(state);
CREATE INDEX IF NOT EXISTS idx_notes_tag ON notes(tag);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- Step 4: Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at 
    BEFORE UPDATE ON notes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify migration
SELECT 
  'Migration Summary' as status,
  (SELECT COUNT(*) FROM articles) as original_articles,
  (SELECT COUNT(*) FROM notes) as migrated_notes,
  (SELECT COUNT(*) FROM notes WHERE state = 'saved') as saved_notes;

COMMIT;

-- Rollback script (keep for safety):
-- DROP TABLE IF EXISTS notes;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;