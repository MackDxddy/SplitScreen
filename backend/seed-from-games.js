import axios from 'axios';
import { pool } from './src/config/database.js';

/**
 * Pre-seed Teams and Players from Game Data
 * Uses ScoreboardPlayers to extract unique teams and players who have actually played
 */

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

// All regions and their 2026 overview pages
const REGIONS = [
  { code: 'LCS', overviewPage: 'LCS/2026 Season/Spring Season' },
  { code: 'LEC', overviewPage: 'LEC/2026 Season/Winter Season' },
  { code: 'LPL', overviewPage: 'LPL/2026 Season/Split 1' },
  { code: 'LCK', overviewPage: 'LCK/2026 Season/Spring' }
];

/**
 * Fetch all players who have played games in a region
 */
async function fetchPlayersFromGames(region, overviewPage) {
  try {
    console.log(`\n👥 Fetching players from ${region} games...`);
    
    const params = {
      action: 'cargoquery',
      format: 'json',
      tables: 'ScoreboardPlayers',
      fields: 'Link, Team, Role',
      where: `OverviewPage="${overviewPage}"`,
      limit: 500
    };

    const response = await axios.get(LEAGUEPEDIA_API, { params });
    
    if (!response.data?.cargoquery) {
      console.log(`⚠️  No players found for ${region}`);
      return { teams: [], players: [] };
    }

    // Extract unique teams and players
    const teamSet = new Set();
    const playerMap = new Map();

    response.data.cargoquery.forEach(item => {
      const teamName = item.title.Team;
      const playerName = item.title.Link;
      const role = item.title.Role;

      // Add team
      if (teamName) {
        teamSet.add(teamName);
      }

      // Add player (use Map to deduplicate and keep latest role)
      if (playerName && teamName) {
        playerMap.set(playerName, {
          ign: playerName,
          team: teamName,
          role: role,
          region: region
        });
      }
    });

    const teams = Array.from(teamSet).map(name => ({
      name,
      shortName: name,
      region
    }));

    const players = Array.from(playerMap.values());

    console.log(`✅ Found ${teams.length} teams and ${players.length} players in ${region}`);
    return { teams, players };

  } catch (error) {
    console.error(`❌ Error fetching ${region}:`, error.message);
    return { teams: [], players: [] };
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
      const existing = await pool.query(
        'SELECT id FROM teams WHERE name = $1',
        [team.name]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO teams (video_game_id, name, short_name, region, active, created_at, updated_at)
         VALUES (1, $1, $2, $3, true, NOW(), NOW())`,
        [team.name, team.shortName, team.region]
      );

      inserted++;
      console.log(`  ✅ ${team.name} (${team.region})`);

    } catch (error) {
      console.error(`  ❌ Error inserting ${team.name}:`, error.message);
    }
  }

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
        'SELECT id FROM teams WHERE name = $1',
        [player.team]
      );

      if (teamResult.rows.length === 0) {
        noTeam++;
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
      console.log(`  ✅ ${player.ign} (${player.team} - ${player.role})`);

    } catch (error) {
      console.error(`  ❌ Error inserting ${player.ign}:`, error.message);
    }
  }

  return { inserted, skipped, noTeam };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Pre-seeding Teams & Players from Game Data\n');
  console.log('⚠️  NOTE: Only players who have actually played games will be included');
  console.log('='.repeat(60));

  const allTeams = [];
  const allPlayers = [];

  // Fetch from each region
  for (const region of REGIONS) {
    const data = await fetchPlayersFromGames(region.code, region.overviewPage);
    allTeams.push(...data.teams);
    allPlayers.push(...data.players);
    
    // Delay to avoid rate limiting
    console.log('  ⏳ Waiting 3 seconds before next region...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log(`\n📊 Total: ${allTeams.length} teams, ${allPlayers.length} players`);

  // Insert teams
  console.log('\n' + '='.repeat(60));
  console.log('💾 Inserting teams...\n');
  const teamStats = await insertTeams(allTeams);

  // Insert players
  console.log('\n' + '='.repeat(60));
  console.log('💾 Inserting players...\n');
  const playerStats = await insertPlayers(allPlayers);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 COMPLETE!\n');
  console.log('TEAMS:');
  console.log(`  ✅ New: ${teamStats.inserted}`);
  console.log(`  ⏭️  Existed: ${teamStats.skipped}`);
  
  console.log('\nPLAYERS:');
  console.log(`  ✅ New: ${playerStats.inserted}`);
  console.log(`  ⏭️  Existed: ${playerStats.skipped}`);
  console.log(`  ⚠️  No team: ${playerStats.noTeam}`);
  console.log('\n' + '='.repeat(60));

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Failed:', error.message);
  process.exit(1);
});
