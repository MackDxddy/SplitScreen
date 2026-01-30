import axios from 'axios';
import { pool } from './src/config/database.js';
import logger from './src/config/logger.js';

/**
 * Pre-seed Teams and Players Script
 * Fetches all active teams and players from LCS, LEC, LPL, LCK
 * No game data - just rosters
 */

const REGIONS = ['LCS', 'LEC', 'LPL', 'LCK'];
const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

/**
 * Query Leaguepedia for teams in a region
 */
async function fetchTeams(region) {
  try {
    console.log(`\n📋 Fetching teams for ${region}...`);
    
    const params = {
      action: 'cargoquery',
      format: 'json',
      tables: 'Teams',
      fields: 'Name, Short, Region',
      where: `Region="${region}" AND IsLowercase="No"`,
      limit: 50
    };

    const response = await axios.get(LEAGUEPEDIA_API, { params });
    
    if (!response.data?.cargoquery) {
      console.log(`⚠️  No teams found for ${region}`);
      return [];
    }

    const teams = response.data.cargoquery.map(item => ({
      name: item.title.Name,
      shortName: item.title.Short || item.title.Name,
      region: item.title.Region
    }));

    console.log(`✅ Found ${teams.length} teams in ${region}`);
    return teams;

  } catch (error) {
    console.error(`❌ Error fetching teams for ${region}:`, error.message);
    return [];
  }
}

/**
 * Query Leaguepedia for players in a region
 */
async function fetchPlayers(region) {
  try {
    console.log(`\n👥 Fetching players for ${region}...`);
    
    // Get current split players from roster changes
    const params = {
      action: 'cargoquery',
      format: 'json',
      tables: 'RosterChangePortal',
      fields: 'Player, Team, Role, Region',
      where: `Region="${region}" AND Date LIKE "2026%" AND NewsId IS NOT NULL`,
      order_by: 'Date DESC',
      limit: 500
    };

    const response = await axios.get(LEAGUEPEDIA_API, { params });
    
    if (!response.data?.cargoquery) {
      console.log(`⚠️  No players found for ${region}`);
      return [];
    }

    // Deduplicate players (same player might have multiple roster changes)
    const playerMap = new Map();
    
    response.data.cargoquery.forEach(item => {
      const playerName = item.title.Player;
      if (!playerMap.has(playerName)) {
        playerMap.set(playerName, {
          ign: playerName,
          team: item.title.Team,
          role: item.title.Role,
          region: item.title.Region
        });
      }
    });

    const players = Array.from(playerMap.values());
    console.log(`✅ Found ${players.length} unique players in ${region}`);
    return players;

  } catch (error) {
    console.error(`❌ Error fetching players for ${region}:`, error.message);
    return [];
  }
}

/**
 * Insert teams into database
 */
async function insertTeams(teams) {
  let inserted = 0;
  let skipped = 0;

  for (const team of teams) {
    try {
      // Check if team exists
      const existing = await pool.query(
        'SELECT id FROM teams WHERE name = $1 OR short_name = $1',
        [team.name]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Insert team
      await pool.query(
        `INSERT INTO teams (video_game_id, name, short_name, region, active, created_at, updated_at)
         VALUES (1, $1, $2, $3, true, NOW(), NOW())`,
        [team.name, team.shortName, team.region]
      );

      inserted++;
      console.log(`  ✅ Created team: ${team.name} (${team.region})`);

    } catch (error) {
      console.error(`  ❌ Error inserting team ${team.name}:`, error.message);
    }
  }

  console.log(`\n📊 Teams: ${inserted} inserted, ${skipped} already existed`);
  return { inserted, skipped };
}

/**
 * Insert players into database
 */
async function insertPlayers(players) {
  let inserted = 0;
  let skipped = 0;
  let noTeam = 0;

  for (const player of players) {
    try {
      // Check if player exists
      const existing = await pool.query(
        'SELECT id FROM players WHERE ign = $1',
        [player.ign]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Find team ID
      const teamResult = await pool.query(
        'SELECT id FROM teams WHERE name = $1 OR short_name = $1',
        [player.team]
      );

      if (teamResult.rows.length === 0) {
        noTeam++;
        console.log(`  ⚠️  Player ${player.ign} - team not found: ${player.team}`);
        continue;
      }

      const teamId = teamResult.rows[0].id;

      // Find role ID
      const roleResult = await pool.query(
        'SELECT id FROM roles WHERE short_name = $1 OR name LIKE $2',
        [player.role, `%${player.role}%`]
      );

      const roleId = roleResult.rows.length > 0 ? roleResult.rows[0].id : 1;

      // Insert player
      await pool.query(
        `INSERT INTO players (video_game_id, team_id, role_id, ign, active, created_at, updated_at)
         VALUES (1, $1, $2, $3, true, NOW(), NOW())`,
        [teamId, roleId, player.ign]
      );

      inserted++;
      console.log(`  ✅ Created player: ${player.ign} (${player.team} - ${player.role})`);

    } catch (error) {
      console.error(`  ❌ Error inserting player ${player.ign}:`, error.message);
    }
  }

  console.log(`\n📊 Players: ${inserted} inserted, ${skipped} already existed, ${noTeam} skipped (no team)`);
  return { inserted, skipped, noTeam };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Team & Player Pre-seed Script\n');
  console.log('Regions:', REGIONS.join(', '));
  console.log('='.repeat(60));

  const allTeams = [];
  const allPlayers = [];

  // Fetch teams from all regions
  for (const region of REGIONS) {
    const teams = await fetchTeams(region);
    allTeams.push(...teams);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n📊 Total teams fetched: ${allTeams.length}`);

  // Insert teams first
  console.log('\n' + '='.repeat(60));
  console.log('💾 Inserting teams into database...\n');
  const teamStats = await insertTeams(allTeams);

  // Fetch players from all regions
  console.log('\n' + '='.repeat(60));
  for (const region of REGIONS) {
    const players = await fetchPlayers(region);
    allPlayers.push(...players);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n📊 Total players fetched: ${allPlayers.length}`);

  // Insert players
  console.log('\n' + '='.repeat(60));
  console.log('💾 Inserting players into database...\n');
  const playerStats = await insertPlayers(allPlayers);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PRE-SEED COMPLETE!\n');
  console.log('TEAMS:');
  console.log(`  ✅ Inserted: ${teamStats.inserted}`);
  console.log(`  ⏭️  Skipped (existed): ${teamStats.skipped}`);
  console.log(`  📊 Total in DB: ${teamStats.inserted + teamStats.skipped}`);
  
  console.log('\nPLAYERS:');
  console.log(`  ✅ Inserted: ${playerStats.inserted}`);
  console.log(`  ⏭️  Skipped (existed): ${playerStats.skipped}`);
  console.log(`  ⚠️  Skipped (no team): ${playerStats.noTeam}`);
  console.log(`  📊 Total in DB: ${playerStats.inserted + playerStats.skipped}`);
  console.log('\n' + '='.repeat(60));

  process.exit(0);
}

// Run script
main().catch(error => {
  console.error('\n❌ Script failed:', error.message);
  process.exit(1);
});
