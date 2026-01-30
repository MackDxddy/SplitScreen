import { pool } from './src/config/database.js';
import salaryCapService from './src/services/salary-cap.service.js';

/**
 * Admin Tool: Set Player & Team Ranks (which auto-calculates prices)
 * 
 * This tool lets you set ranks for players/teams.
 * Prices are calculated automatically using linear distribution.
 * 
 * Example: LCS has 8 teams
 * - Rank 1: $500,000
 * - Rank 2: $467,857
 * - ...
 * - Rank 8: $275,000
 */

console.log('🏷️  SplitScreen - Salary Cap Pricing Tool\n');
console.log('='.repeat(70));

/**
 * Set rank for a single player
 */
async function setPlayerRank(playerId, rankInRole) {
  const result = await salaryCapService.setPlayerRank(playerId, rankInRole);
  console.log(`✅ Player ${playerId}: Rank ${rankInRole} → $${result.price.toLocaleString()}`);
  return result;
}

/**
 * Set rank for a single team
 */
async function setTeamRank(teamId, rankInRegion) {
  const result = await salaryCapService.setTeamRank(teamId, rankInRegion);
  console.log(`✅ Team ${teamId}: Rank ${rankInRegion} → $${result.price.toLocaleString()}`);
  return result;
}

/**
 * Set all players in a region/role to their ranks
 */
async function setPlayerRanksByRegionRole(region, role, rankings) {
  console.log(`\n📋 Setting ranks for ${region} ${role}...`);
  
  const playerUpdates = [];
  for (const { ign, rank } of rankings) {
    const playerResult = await pool.query(
      `SELECT p.id 
       FROM players p 
       JOIN teams t ON t.id = p.team_id 
       JOIN roles r ON r.id = p.role_id 
       WHERE p.ign = $1 AND t.region = $2 AND r.short_name = $3 AND p.is_primary = true`,
      [ign, region, role]
    );
    
    if (playerResult.rows.length > 0) {
      playerUpdates.push({ 
        playerId: playerResult.rows[0].id, 
        rankInRole: rank 
      });
    } else {
      console.log(`⚠️  Player not found: ${ign} (${region} ${role})`);
    }
  }
  
  const results = await salaryCapService.bulkSetPlayerRanks(playerUpdates);
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Updated ${successCount}/${playerUpdates.length} players`);
  return results;
}

/**
 * Set all teams in a region to their ranks
 */
async function setTeamRanksByRegion(region, rankings) {
  console.log(`\n📋 Setting ranks for ${region} teams...`);
  
  const teamUpdates = [];
  for (const { teamName, rank } of rankings) {
    const teamResult = await pool.query(
      'SELECT id FROM teams WHERE name = $1 AND region = $2',
      [teamName, region]
    );
    
    if (teamResult.rows.length > 0) {
      teamUpdates.push({ 
        teamId: teamResult.rows[0].id, 
        rankInRegion: rank 
      });
    } else {
      console.log(`⚠️  Team not found: ${teamName} (${region})`);
    }
  }
  
  const results = await salaryCapService.bulkSetTeamRanks(teamUpdates);
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Updated ${successCount}/${teamUpdates.length} teams`);
  return results;
}

/**
 * List all current prices
 */
async function listAllPrices(region = null) {
  const whereClause = region ? 'WHERE t.region = $1' : '';
  const params = region ? [region] : [];
  
  const playersResult = await pool.query(
    `SELECT 
      p.id,
      p.ign,
      t.name as team,
      t.region,
      r.short_name as role,
      p.rank_in_role,
      p.current_price,
      p.is_primary
     FROM players p
     JOIN teams t ON t.id = p.team_id
     JOIN roles r ON r.id = p.role_id
     ${whereClause}
     ORDER BY t.region, r.id, p.current_price DESC`,
    params
  );

  const teamsResult = await pool.query(
    `SELECT 
      id,
      name,
      region,
      rank_in_region,
      current_price
     FROM teams
     ${whereClause}
     ORDER BY region, current_price DESC`,
    params
  );

  console.log('\n📊 PLAYER PRICES:');
  console.log('='.repeat(90));
  console.log('ID'.padEnd(6) + 'Name'.padEnd(18) + 'Team'.padEnd(18) + 'Region'.padEnd(8) + 'Role'.padEnd(6) + 'Rank'.padEnd(6) + 'Price'.padEnd(12) + 'Primary');
  console.log('-'.repeat(90));
  
  playersResult.rows.forEach(p => {
    console.log(
      String(p.id).padEnd(6) +
      (p.ign || 'N/A').substring(0, 17).padEnd(18) +
      (p.team || 'N/A').substring(0, 17).padEnd(18) +
      (p.region || 'N/A').padEnd(8) +
      (p.role || 'N/A').padEnd(6) +
      (p.rank_in_role || '-').toString().padEnd(6) +
      `$${(p.current_price || 0).toLocaleString()}`.padEnd(12) +
      (p.is_primary ? '✓' : '')
    );
  });

  console.log('\n📊 TEAM PRICES:');
  console.log('='.repeat(70));
  console.log('ID'.padEnd(6) + 'Name'.padEnd(30) + 'Region'.padEnd(10) + 'Rank'.padEnd(6) + 'Price');
  console.log('-'.repeat(70));
  
  teamsResult.rows.forEach(t => {
    console.log(
      String(t.id).padEnd(6) +
      t.name.substring(0, 29).padEnd(30) +
      (t.region || 'N/A').padEnd(10) +
      (t.rank_in_region || '-').toString().padEnd(6) +
      `$${(t.current_price || 0).toLocaleString()}`
    );
  });
}

/**
 * Show pricing formula for a region
 */
async function showPricingFormula(region) {
  const configResult = await pool.query(
    'SELECT * FROM salary_cap_config WHERE region = $1 AND season = $2',
    [region, '2026']
  );

  if (configResult.rows.length === 0) {
    console.log(`❌ No config found for ${region}`);
    return;
  }

  const config = configResult.rows[0];
  console.log(`\n💰 PRICING FORMULA FOR ${region}:`);
  console.log('='.repeat(70));
  console.log(`Season: ${config.season}`);
  console.log(`Total Teams: ${config.total_teams}`);
  console.log(`Players per Role: ${config.total_players_per_role}`);
  console.log(`Price Range: $${config.min_price.toLocaleString()} - $${config.max_price.toLocaleString()}`);
  console.log(`\nPrice Steps (Teams):`);
  
  for (let rank = 1; rank <= config.total_teams; rank++) {
    const priceResult = await pool.query(
      'SELECT calculate_linear_price($1, $2, $3, $4) as price',
      [rank, config.total_teams, config.min_price, config.max_price]
    );
    console.log(`  Rank ${rank}: $${priceResult.rows[0].price.toLocaleString()}`);
  }
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function main() {
  try {
    console.log('\n🚀 Starting pricing tool...\n');

    // EXAMPLE 1: Set individual player rank
    // await setPlayerRank(1, 1);  // Player ID 1 → Rank 1

    // EXAMPLE 2: Set individual team rank
    // await setTeamRank(1, 1);  // Team ID 1 → Rank 1 in region

    // EXAMPLE 3: Bulk set LCS ADC rankings
    // await setPlayerRanksByRegionRole('LCS', 'ADC', [
    //   { ign: 'Doublelift', rank: 1 },
    //   { ign: 'Zven', rank: 2 },
    //   { ign: 'FBI', rank: 3 },
    // ]);

    // EXAMPLE 4: Bulk set LCS team rankings
    // await setTeamRanksByRegion('LCS', [
    //   { teamName: 'Cloud9', rank: 1 },
    //   { teamName: 'Team Liquid', rank: 2 },
    //   { teamName: 'FlyQuest', rank: 3 },
    // ]);

    // EXAMPLE 5: Show pricing formula
    await showPricingFormula('LCS');

    // EXAMPLE 6: List all prices
    await listAllPrices();  // All regions
    // await listAllPrices('LCS');  // Specific region

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { 
  setPlayerRank, 
  setTeamRank, 
  setPlayerRanksByRegionRole, 
  setTeamRanksByRegion,
  listAllPrices,
  showPricingFormula 
};
