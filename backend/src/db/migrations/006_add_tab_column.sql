-- Migration: 006_add_tab_column.sql
-- Description: Add tab column to matches table for week extraction
-- Date: January 29, 2026

-- Add tab column
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tab VARCHAR(100);

COMMENT ON COLUMN matches.tab IS 'Tab value from Leaguepedia (e.g., "Week 3", "Week_3") - used to extract week number';

CREATE INDEX IF NOT EXISTS idx_matches_tab ON matches(tab);

-- Add function to parse week number from tab
CREATE OR REPLACE FUNCTION extract_week_from_tab(tab_value TEXT)
RETURNS INTEGER AS $$
DECLARE
  week_num INTEGER;
BEGIN
  -- Handle NULL
  IF tab_value IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try to extract number from various formats:
  -- "Week 3" -> 3
  -- "Week_3" -> 3
  -- "W3" -> 3
  -- "3" -> 3
  
  -- Remove common prefixes and extract number
  week_num := (regexp_match(tab_value, '(\d+)'))[1]::INTEGER;
  
  RETURN week_num;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_week_from_tab IS 'Extract week number from tab string (e.g., "Week 3" -> 3)';

-- Test the function
DO $$
DECLARE
  test1 INTEGER;
  test2 INTEGER;
  test3 INTEGER;
BEGIN
  test1 := extract_week_from_tab('Week 3');
  test2 := extract_week_from_tab('Week_3');
  test3 := extract_week_from_tab('W3');
  
  IF test1 != 3 OR test2 != 3 OR test3 != 3 THEN
    RAISE EXCEPTION 'extract_week_from_tab function tests failed';
  END IF;
  
  RAISE NOTICE '✅ extract_week_from_tab function tests passed';
  RAISE NOTICE '✅ Added tab column and week extraction function';
END $$;
