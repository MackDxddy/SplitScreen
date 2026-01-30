-- Migration: Make match_date column nullable
-- Date: 2026-01-28
-- Issue: Leaguepedia DateTime_UTC is sometimes null, but our schema requires NOT NULL

-- Allow match_date to be null (some games don't have timestamp data yet)
ALTER TABLE matches 
ALTER COLUMN match_date DROP NOT NULL;
