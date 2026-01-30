-- Migration: 005_add_salary_cap_team_slot_system.sql
-- Description: Complete salary cap with team+role slot drafting and linear pricing
-- Date: January 29, 2026

-- ============================================================================
-- MATCHES TABLE - Add week column for weekly scoring
-- ============================================================================

-- Check if week column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matches' AND column_name = 'week'
  ) THEN
    ALTER TABLE matches ADD COLUMN week INTEGER;
    CREATE INDEX idx_matches_week ON matches(week);
    
    RAISE NOTICE 'Added week column to matches table';
  ELSE
    RAISE NOTICE 'Week column already exists in matches table';
  END IF;
END $$;

COMMENT ON COLUMN matches.week IS 'Week number within the split (1, 2, 3, etc.)';

-- ============================================================================
-- PLAYERS TABLE - Add pricing and primary player designation
-- ============================================================================

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS current_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank_in_role INTEGER,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN players.current_price IS 'Salary cap price (calculated linearly from rank)';
COMMENT ON COLUMN players.rank_in_role IS 'Rank within role in region (1=best, determines price)';
COMMENT ON COLUMN players.is_primary IS 'True = primary starter for team+role slot';

CREATE INDEX IF NOT EXISTS idx_players_rank ON players(role_id, team_id, rank_in_role);
CREATE INDEX IF NOT EXISTS idx_players_primary ON players(team_id, role_id, is_primary) WHERE is_primary = true;

-- ============================================================================
-- TEAMS TABLE - Add pricing fields
-- ============================================================================

ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS current_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank_in_region INTEGER;

COMMENT ON COLUMN teams.current_price IS 'Salary cap price (calculated linearly from rank)';
COMMENT ON COLUMN teams.rank_in_region IS 'Rank within region (1=best, determines price)';

CREATE INDEX IF NOT EXISTS idx_teams_rank ON teams(region, rank_in_region);

-- ============================================================================
-- ROSTERS TABLE - Add salary tracking
-- ============================================================================

ALTER TABLE rosters 
ADD COLUMN IF NOT EXISTS total_salary INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_budget INTEGER DEFAULT 2400000;

COMMENT ON COLUMN rosters.total_salary IS 'Sum of all acquisition prices';
COMMENT ON COLUMN rosters.remaining_budget IS 'Budget remaining (starts at $2.4MM)';

CREATE INDEX IF NOT EXISTS idx_rosters_budget ON rosters(remaining_budget);

-- ============================================================================
-- NEW TABLE: roster_team_slots (REPLACES roster_players)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roster_team_slots (
  id SERIAL PRIMARY KEY,
  roster_id INTEGER NOT NULL REFERENCES rosters(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  primary_player_id INTEGER REFERENCES players(id),
  acquisition_price INTEGER NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(roster_id, team_id, role_id),
  UNIQUE(roster_id, role_id)
);

COMMENT ON TABLE roster_team_slots IS 'Users draft team+role (e.g., "TL ADC"), not individuals';
COMMENT ON COLUMN roster_team_slots.primary_player_id IS 'Primary player for pricing';

CREATE INDEX IF NOT EXISTS idx_slots_roster ON roster_team_slots(roster_id);
CREATE INDEX IF NOT EXISTS idx_slots_team_role ON roster_team_slots(team_id, role_id);

-- ============================================================================
-- ROSTER_TEAMS - Add acquisition price
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'roster_teams' AND column_name = 'acquisition_price'
  ) THEN
    ALTER TABLE roster_teams ADD COLUMN acquisition_price INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- TRADES - Track salary impact
-- ============================================================================

ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS salary_impact_from_user INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS salary_impact_to_user INTEGER DEFAULT 0;

-- ============================================================================
-- PRICING CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS salary_cap_config (
  id SERIAL PRIMARY KEY,
  season VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL,
  min_price INTEGER NOT NULL DEFAULT 275000,
  max_price INTEGER NOT NULL DEFAULT 500000,
  total_teams INTEGER NOT NULL,
  total_players_per_role INTEGER NOT NULL,
  UNIQUE(season, region)
);

-- Insert default configs (only if table is empty)
INSERT INTO salary_cap_config (season, region, min_price, max_price, total_teams, total_players_per_role)
SELECT '2026', 'LCS', 275000, 500000, 8, 8
WHERE NOT EXISTS (SELECT 1 FROM salary_cap_config WHERE season = '2026' AND region = 'LCS');

INSERT INTO salary_cap_config (season, region, min_price, max_price, total_teams, total_players_per_role)
SELECT '2026', 'LEC', 275000, 500000, 10, 10
WHERE NOT EXISTS (SELECT 1 FROM salary_cap_config WHERE season = '2026' AND region = 'LEC');

INSERT INTO salary_cap_config (season, region, min_price, max_price, total_teams, total_players_per_role)
SELECT '2026', 'LCK', 275000, 500000, 10, 10
WHERE NOT EXISTS (SELECT 1 FROM salary_cap_config WHERE season = '2026' AND region = 'LCK');

INSERT INTO salary_cap_config (season, region, min_price, max_price, total_teams, total_players_per_role)
SELECT '2026', 'LPL', 275000, 500000, 17, 17
WHERE NOT EXISTS (SELECT 1 FROM salary_cap_config WHERE season = '2026' AND region = 'LPL');

CREATE INDEX IF NOT EXISTS idx_salary_config ON salary_cap_config(season, region);

-- ============================================================================
-- FUNCTION: Linear price calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_linear_price(
  rank INTEGER,
  total INTEGER,
  min_price INTEGER DEFAULT 275000,
  max_price INTEGER DEFAULT 500000
) RETURNS INTEGER AS $$
DECLARE
  range INTEGER;
  steps INTEGER;
  step_size NUMERIC;
  price NUMERIC;
BEGIN
  IF total = 1 THEN RETURN max_price; END IF;
  
  range := max_price - min_price;
  steps := total - 1;
  step_size := range::NUMERIC / steps::NUMERIC;
  price := max_price - ((rank - 1) * step_size);
  
  RETURN ROUND(price)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGER: Auto-update roster budget
-- ============================================================================

CREATE OR REPLACE FUNCTION update_roster_salary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rosters SET 
    total_salary = COALESCE(
      (SELECT SUM(acquisition_price) FROM roster_team_slots WHERE roster_id = NEW.roster_id), 0
    ) + COALESCE(
      (SELECT SUM(acquisition_price) FROM roster_teams WHERE roster_id = NEW.roster_id), 0
    ),
    remaining_budget = 2400000 - (
      COALESCE((SELECT SUM(acquisition_price) FROM roster_team_slots WHERE roster_id = NEW.roster_id), 0) +
      COALESCE((SELECT SUM(acquisition_price) FROM roster_teams WHERE roster_id = NEW.roster_id), 0)
    )
  WHERE id = NEW.roster_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS salary_on_slot_insert ON roster_team_slots;
DROP TRIGGER IF EXISTS salary_on_slot_update ON roster_team_slots;
DROP TRIGGER IF EXISTS salary_on_slot_delete ON roster_team_slots;
DROP TRIGGER IF EXISTS salary_on_team_insert ON roster_teams;
DROP TRIGGER IF EXISTS salary_on_team_update ON roster_teams;
DROP TRIGGER IF EXISTS salary_on_team_delete ON roster_teams;

-- Create triggers
CREATE TRIGGER salary_on_slot_insert AFTER INSERT ON roster_team_slots
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();
CREATE TRIGGER salary_on_slot_update AFTER UPDATE ON roster_team_slots
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();
CREATE TRIGGER salary_on_slot_delete AFTER DELETE ON roster_team_slots
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();
CREATE TRIGGER salary_on_team_insert AFTER INSERT ON roster_teams
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();
CREATE TRIGGER salary_on_team_update AFTER UPDATE ON roster_teams
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();
CREATE TRIGGER salary_on_team_delete AFTER DELETE ON roster_teams
  FOR EACH ROW EXECUTE FUNCTION update_roster_salary();

-- ============================================================================
-- VIEW: Weekly points per slot (shows which player scored)
-- ============================================================================

CREATE OR REPLACE VIEW roster_slot_weekly_points AS
SELECT 
  rts.id AS slot_id,
  rts.roster_id,
  t.name AS team_name,
  r.name AS role_name,
  p.ign AS player_name,
  m.week,
  m.match_date,
  ps.fantasy_points,
  ps.kills,
  ps.deaths,
  ps.assists
FROM roster_team_slots rts
JOIN teams t ON t.id = rts.team_id
JOIN roles r ON r.id = rts.role_id
JOIN players p ON p.team_id = rts.team_id AND p.role_id = rts.role_id
JOIN player_stats ps ON ps.player_id = p.id
JOIN matches m ON m.id = ps.match_id;

COMMENT ON VIEW roster_slot_weekly_points IS 'Shows which player scored for each roster slot per game';

-- ============================================================================
-- Validation
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'week') THEN
    RAISE EXCEPTION 'Week column not added to matches table';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'roster_team_slots') THEN
    RAISE EXCEPTION 'roster_team_slots not created';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_linear_price') THEN
    RAISE EXCEPTION 'calculate_linear_price function not created';
  END IF;
  
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '✅ Week column added to matches table';
  RAISE NOTICE '✅ Team slot drafting system ready';
  RAISE NOTICE '✅ Linear pricing installed';
  RAISE NOTICE '✅ Budget triggers active';
END $$;
