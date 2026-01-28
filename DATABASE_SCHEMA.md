# Database Schema Documentation

**Version:** 1.0  
**Date:** January 29, 2025  
**Total Tables:** 16

## 📊 Schema Overview

The database is organized with **video_games** as the parent entity, allowing support for multiple games (League of Legends, Rainbow 6 Siege, future games).

## 🎮 Parent Entity

### video_games
The root table for all game-specific data.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR(100) | Full game name |
| short_code | VARCHAR(10) | Unique code (lol, r6) |
| description | TEXT | Game description |
| active | BOOLEAN | Is game currently supported |

**Indexes:** short_code, active

---

## 📋 Core Tables (Direct Children of video_games)

### 1. roles
Game-specific player roles (Top/Jungle/Mid/ADC/Support for LoL)

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| video_game_id | INTEGER | FK to video_games |
| name | VARCHAR(50) | Role name |
| short_name | VARCHAR(20) | Abbreviated name |
| display_order | INTEGER | Order for UI display |

**Unique Constraints:** (video_game_id, name), (video_game_id, short_name)

### 2. teams
Professional esports teams by game and region

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| video_game_id | INTEGER | FK to video_games |
| name | VARCHAR(100) | Team name |
| short_name | VARCHAR(20) | Abbreviation |
| region | VARCHAR(20) | LCS, LEC, LCK, LPL |
| logo_url | VARCHAR(500) | Team logo |
| active | BOOLEAN | Currently active |

**Unique Constraint:** (video_game_id, name, region)  
**Indexes:** video_game_id, region, active

### 3. players
Professional esports players with game-specific roles

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| video_game_id | INTEGER | FK to video_games |
| team_id | INTEGER | FK to teams (nullable) |
| role_id | INTEGER | FK to roles |
| ign | VARCHAR(50) | In-game name |
| real_name | VARCHAR(100) | Real name |
| photo_url | VARCHAR(500) | Player photo |
| active | BOOLEAN | Currently active |

**Unique Constraint:** (video_game_id, ign)  
**Indexes:** video_game_id, team_id, role_id, ign, active

### 4. matches
Professional esports games/matches

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| video_game_id | INTEGER | FK to video_games |
| tournament | VARCHAR(100) | Tournament name |
| region | VARCHAR(20) | Region |
| blue_team_id | INTEGER | FK to teams |
| red_team_id | INTEGER | FK to teams |
| winning_team_id | INTEGER | FK to teams |
| match_date | TIMESTAMPTZ | When match occurred |
| duration_seconds | INTEGER | Match duration |
| status | VARCHAR(20) | Validation status |
| external_id | VARCHAR(100) | Leaguepedia ID |

**Status Values:** processing, pending_validation, validated, flagged, resolved  
**Indexes:** video_game_id, region, match_date, status, tournament, external_id

### 5. leagues
Fantasy leagues created by users

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| video_game_id | INTEGER | FK to video_games |
| host_user_id | INTEGER | FK to users |
| name | VARCHAR(100) | League name |
| invite_code | VARCHAR(20) | Unique join code |
| privacy | VARCHAR(20) | private or public |
| regions | VARCHAR[] | Array of regions |
| salary_cap_enabled | BOOLEAN | Salary cap on/off |
| salary_cap_amount | INTEGER | Cap amount if enabled |
| max_participants | INTEGER | 2-10 participants |
| draft_date | TIMESTAMPTZ | Scheduled draft time |
| draft_timer_seconds | INTEGER | 120, 180, 240, or 300 |
| check_in_duration_minutes | INTEGER | Check-in window |
| status | VARCHAR(20) | League status |

**Status Values:** pending, drafting, active, completed, cancelled  
**Indexes:** video_game_id, host_user_id, invite_code, status, draft_date

---

## 👤 User Tables

### users
Platform users with authentication and membership

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| email | VARCHAR(255) | Unique email |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| username | VARCHAR(50) | Unique username |
| profile_picture_url | VARCHAR(500) | Profile photo |
| membership_tier | VARCHAR(20) | free or pro |
| email_verified | BOOLEAN | Email confirmed |
| is_admin | BOOLEAN | Admin privileges |
| last_login_at | TIMESTAMPTZ | Last login |

**Indexes:** email, username, membership_tier

### league_participants
Users who joined a league

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| league_id | INTEGER | FK to leagues |
| user_id | INTEGER | FK to users |
| draft_order | INTEGER | Draft position |
| checked_in | BOOLEAN | Draft check-in status |
| joined_at | TIMESTAMPTZ | When they joined |

**Unique Constraints:** (league_id, user_id), (league_id, draft_order)

---

## 🏆 Fantasy Roster Tables

### rosters
User's fantasy roster in a league

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| league_id | INTEGER | FK to leagues |
| user_id | INTEGER | FK to users |
| roster_name | VARCHAR(100) | Custom roster name |
| total_points | DECIMAL(10,2) | Total fantasy points |

**Unique Constraint:** (league_id, user_id)  
**Indexes:** league_id, user_id, total_points

### roster_players
Players assigned to fantasy rosters

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| roster_id | INTEGER | FK to rosters |
| player_id | INTEGER | FK to players |
| acquired_at | TIMESTAMPTZ | When acquired (for trade cutoff) |

**Unique Constraint:** (roster_id, player_id)

### roster_teams
Teams assigned to fantasy rosters

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| roster_id | INTEGER | FK to rosters |
| team_id | INTEGER | FK to teams |
| acquired_at | TIMESTAMPTZ | When acquired |

**Unique Constraint:** (roster_id, team_id)

---

## 📈 Statistics Tables

### player_stats
Per-game player performance and fantasy points

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| match_id | INTEGER | FK to matches |
| player_id | INTEGER | FK to players |
| kills | SMALLINT | Kills |
| deaths | SMALLINT | Deaths |
| assists | SMALLINT | Assists |
| cs | SMALLINT | Creep score |
| gold | INTEGER | Gold earned |
| damage | INTEGER | Damage dealt |
| vision_score | SMALLINT | Vision score |
| fantasy_points | DECIMAL(10,2) | Calculated points |
| source | VARCHAR(20) | Data source |
| validated | BOOLEAN | Validation status |
| corrected_at | TIMESTAMPTZ | If corrected |
| correction_reason | TEXT | Why corrected |

**Source Values:** leaguepedia, oracle_elixir, manual  
**Unique Constraint:** (match_id, player_id)  
**Indexes:** match_id, player_id, validated, source

### team_stats
Per-game team performance and fantasy points

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| match_id | INTEGER | FK to matches |
| team_id | INTEGER | FK to teams |
| dragons | SMALLINT | Dragons taken |
| rift_heralds | SMALLINT | Heralds taken |
| barons | SMALLINT | Barons taken |
| turrets | SMALLINT | Turrets destroyed |
| inhibitors | SMALLINT | Inhibitors destroyed |
| total_kills | SMALLINT | Total team kills |
| won | BOOLEAN | Did team win |
| fantasy_points | DECIMAL(10,2) | Calculated points |
| source | VARCHAR(20) | Data source |
| validated | BOOLEAN | Validation status |
| corrected_at | TIMESTAMPTZ | If corrected |
| correction_reason | TEXT | Why corrected |

**Unique Constraint:** (match_id, team_id)  
**Indexes:** match_id, team_id, validated, source

---

## 💱 Trading System

### trades
Player/team trades between users or with system

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| league_id | INTEGER | FK to leagues |
| from_user_id | INTEGER | FK to users (proposer) |
| to_user_id | INTEGER | FK to users (NULL for system) |
| from_player_id | INTEGER | FK to players (giving away) |
| to_player_id | INTEGER | FK to players (receiving) |
| from_team_id | INTEGER | FK to teams (giving away) |
| to_team_id | INTEGER | FK to teams (receiving) |
| status | VARCHAR(20) | Trade status |
| fulfillment_priority | INTEGER | For trade queue |
| expires_at | TIMESTAMPTZ | Trade expiration |

**Status Values:** pending, accepted, rejected, fulfilled, cancelled  
**Indexes:** league_id, from_user_id, to_user_id, status, fulfillment_priority

---

## 🔍 Validation & Audit

### validation_logs
Discrepancy tracking between data sources

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| match_id | INTEGER | FK to matches |
| discrepancy_type | VARCHAR(50) | Type of mismatch |
| severity | VARCHAR(20) | Severity level |
| lp_data | JSONB | Leaguepedia data |
| oe_data | JSONB | Oracle's Elixir data |
| resolution | VARCHAR(20) | How resolved |
| resolved_at | TIMESTAMPTZ | When resolved |
| notes | TEXT | Additional notes |

**Severity Values:** critical, high, medium, low  
**Resolution Values:** auto_corrected, manual_review, ignored, resolved  
**Indexes:** match_id, severity, resolution

### admin_audit
Complete audit trail of admin actions

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| admin_user_id | INTEGER | FK to users |
| action | VARCHAR(100) | Action performed |
| target_table | VARCHAR(50) | Table modified |
| target_id | INTEGER | Record modified |
| old_value | JSONB | Before modification |
| new_value | JSONB | After modification |
| reason | TEXT | Why changed |
| ip_address | VARCHAR(45) | Admin IP |

**Indexes:** admin_user_id, action, (target_table, target_id), created_at

---

## 🗺️ Entity Relationship Diagram

```
video_games (Parent)
├── roles
├── teams
│   ├── players (also references roles)
│   └── matches
│       ├── player_stats (references players)
│       ├── team_stats (references teams)
│       └── validation_logs
└── leagues (also references users)
    ├── league_participants (references users)
    ├── rosters (references users)
    │   ├── roster_players (references players)
    │   └── roster_teams (references teams)
    └── trades (references users, players, teams)

users (Independent)
├── leagues (as host)
├── league_participants
├── rosters
├── trades (as from_user or to_user)
└── admin_audit (as admin)
```

---

## 🔐 Data Integrity

### Cascading Deletes
- Deleting a **video_game** cascades to all child entities
- Deleting a **user** cascades to their leagues, rosters, trades
- Deleting a **league** cascades to participants, rosters, trades
- Deleting a **roster** cascades to roster_players and roster_teams

### Nullable Foreign Keys
- **players.team_id** - Players can be teamless (free agents)
- **trades.to_user_id** - NULL for user-to-system trades
- **matches.blue_team_id/red_team_id** - Nullable if team data unavailable

### Check Constraints
- **users.membership_tier** - Only 'free' or 'pro'
- **leagues.privacy** - Only 'private' or 'public'
- **leagues.max_participants** - Between 2 and 10
- **leagues.draft_timer_seconds** - 120, 180, 240, or 300
- **matches.status** - Defined status values
- **player_stats/team_stats.source** - Defined source values

---

## 📝 Seed Data Included

The migration includes initial seed data:

**Video Games:**
- League of Legends (lol)

**Roles (League of Legends):**
1. Top Lane
2. Jungle
3. Mid Lane
4. Attack Damage Carry (ADC)
5. Support

---

## 🚀 Running the Migration

```bash
# Navigate to backend
cd C:\Users\Kenzie\Desktop\splitscreen-fantasy\backend

# Run migration
npm run migrate

# (Optional) Seed test data
npm run seed
```

---

## 📊 Expected Output

After running migration:
- ✅ 16 tables created
- ✅ 50+ indexes created
- ✅ 1 video game inserted
- ✅ 5 roles inserted
- ✅ Triggers for updated_at columns

After running seed:
- ✅ 5 test users
- ✅ 9 teams (LCS, LEC, LCK, LPL)
- ✅ 15 players
- ✅ 1 sample league

---

*Last Updated: January 29, 2025*
