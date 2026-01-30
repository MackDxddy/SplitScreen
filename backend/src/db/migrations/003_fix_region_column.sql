-- Migration: Fix VARCHAR column sizes in matches table
-- Date: 2026-01-28
-- Issue: Region column is VARCHAR(20) but actual values are 26+ characters (e.g., "LPL/2026 Season/Split 1")

-- Fix region column to accommodate longer region strings
ALTER TABLE matches 
ALTER COLUMN region TYPE VARCHAR(100);

-- Fix tournament column which might have long tournament names
ALTER TABLE matches 
ALTER COLUMN tournament TYPE VARCHAR(200);

-- Fix patch_version which might have longer values
ALTER TABLE matches 
ALTER COLUMN patch_version TYPE VARCHAR(50);

-- Fix status column to accommodate longer status strings
ALTER TABLE matches 
ALTER COLUMN status TYPE VARCHAR(50);
