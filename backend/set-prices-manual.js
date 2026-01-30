import { pool } from './src/config/database.js';

/**
 * Manual Price Setter - Set player and team prices directly
 * No ranks needed - just set the exact price you want
 */

console.log('💰 SplitScreen - Manual Price Setter\n');
console.log('='.repeat(70));

/**
 * Set a player's price directly
 */
async function setPlayerPrice(playerId, price) {
  try {
    await pool.query(
      'UPDATE players SET current_price = $1 WHERE id = $2',
      [price, playerId]
    );
    
    const result = await pool.query(
      `SELECT p.ign, t.name as team, r.short_name as role
       FROM players p
       JOIN teams t ON t.id = p.team_id
       JOIN roles r ON r.id = p.role_id
       WHERE p.id = $1`,
      [playerId]
    );
    
    if (result.rows.length > 0) {
      const player = result.rows[0];
      console.log(`✅ ${player.ign} (${player.team} ${player.role}): $${price.toLocaleString()}`);
    }
    
    return { success: true, playerId, price };
  } catch (error) {
    console.error(`❌ Error setting player ${playerId} price:`, error.message);
    return { success: false, playerId, error: error.message };
  }
}

/**
 * Set a team's price directly
 */
async function setTeamPrice(teamId, price) {
  try {
    await pool.query(
      'UPDATE teams SET current_price = $1 WHERE id = $2',
      [price, teamId]
    );
    
    const result = await pool.query(
      'SELECT name, region FROM teams WHERE id = $1',
      [teamId]
    );
    
    if (result.rows.length > 0) {
      const team = result.rows[0];
      console.log(`✅ ${team.name} (${team.region}): $${price.toLocaleString()}`);
    }
    
    return { success: true, teamId, price };
  } catch (error) {
    console.error(`❌ Error setting team ${teamId} price:`, error.message);
    return { success: false, teamId, error: error.message };
  }
}

/**
 * Set prices for multiple players at once
 */
async function bulkSetPlayerPrices(playerPrices) {
  console.log(`\n📋 Setting prices for ${playerPrices.length} players...\n`);
  const results = [];
  
  for (const { playerId, price } of playerPrices) {
    const result = await setPlayerPrice(playerId, price);
    results.push(result);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Successfully set ${successCount}/${playerPrices.length} player prices`);
  return results;
}

/**
 * Set prices for multiple teams at once
 */
async function bulkSetTeamPrices(teamPrices) {
  console.log(`\n📋 Setting prices for ${teamPrices.length} teams...\n`);
  const results = [];
  
  for (const { teamId, price } of teamPrices) {
    const result = await setTeamPrice(teamId, price);
    results.push(result);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✅ Successfully set ${successCount}/${teamPrices.length} team prices`);
  return results;
}

/**
 * Find player ID by name
 */
async function findPlayer(ign, region = null) {
  const query = region 
    ? `SELECT p.id, p.ign, t.name as team, r.short_name as role, t.region, p.current_price
       FROM players p
       JOIN teams t ON t.id = p.team_id
       JOIN roles r ON r.id = p.role_id
       WHERE p.ign ILIKE $1 AND t.region = $2`
    : `SELECT p.id, p.ign, t.name as team, r.short_name as role, t.region, p.current_price
       FROM players p
       JOIN teams t ON t.id = p.team_id
       JOIN roles r ON r.id = p.role_id
       WHERE p.ign ILIKE $1`;
  
  const params = region ? [ign, region] : [ign];
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    console.log(`❌ Player not found: ${ign}`);
    return null;
  }
  
  if (result.rows.length > 1) {
    console.log(`⚠️  Multiple players found for "${ign}":`);
    result.rows.forEach(p => {
      console.log(`   ID ${p.id}: ${p.ign} (${p.team} ${p.role}, ${p.region}) - Current: $${p.current_price?.toLocaleString() || 0}`);
    });
    return null;
  }
  
  return result.rows[0];
}

/**
 * Find team ID by name
 */
async function findTeam(teamName, region = null) {
  const query = region
    ? 'SELECT id, name, region, current_price FROM teams WHERE name ILIKE $1 AND region = $2'
    : 'SELECT id, name, region, current_price FROM teams WHERE name ILIKE $1';
  
  const params = region ? [teamName, region] : [teamName];
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    console.log(`❌ Team not found: ${teamName}`);
    return null;
  }
  
  if (result.rows.length > 1) {
    console.log(`⚠️  Multiple teams found for "${teamName}":`);
    result.rows.forEach(t => {
      console.log(`   ID ${t.id}: ${t.name} (${t.region}) - Current: $${t.current_price?.toLocaleString() || 0}`);
    });
    return null;
  }
  
  return result.rows[0];
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
      p.current_price,
      p.is_primary
     FROM players p
     JOIN teams t ON t.id = p.team_id
     JOIN roles r ON r.id = p.role_id
     ${whereClause}
     ORDER BY t.region, p.current_price DESC`,
    params
  );

  const teamsResult = await pool.query(
    `SELECT id, name, region, current_price
     FROM teams
     ${whereClause}
     ORDER BY region, current_price DESC`,
    params
  );

  console.log('\n📊 PLAYER PRICES:');
  console.log('='.repeat(90));
  console.log('ID'.padEnd(6) + 'Name'.padEnd(18) + 'Team'.padEnd(18) + 'Region'.padEnd(8) + 'Role'.padEnd(6) + 'Price'.padEnd(12) + 'Primary');
  console.log('-'.repeat(90));
  
  playersResult.rows.forEach(p => {
    console.log(
      String(p.id).padEnd(6) +
      (p.ign || 'N/A').substring(0, 17).padEnd(18) +
      (p.team || 'N/A').substring(0, 17).padEnd(18) +
      (p.region || 'N/A').padEnd(8) +
      (p.role || 'N/A').padEnd(6) +
      `$${(p.current_price || 0).toLocaleString()}`.padEnd(12) +
      (p.is_primary ? '✓' : '')
    );
  });

  console.log('\n📊 TEAM PRICES:');
  console.log('='.repeat(70));
  console.log('ID'.padEnd(6) + 'Name'.padEnd(30) + 'Region'.padEnd(10) + 'Price');
  console.log('-'.repeat(70));
  
  teamsResult.rows.forEach(t => {
    console.log(
      String(t.id).padEnd(6) +
      t.name.substring(0, 29).padEnd(30) +
      (t.region || 'N/A').padEnd(10) +
      `$${(t.current_price || 0).toLocaleString()}`
    );
  });
}

/**
 * Set all players in region to same price (useful for bulk defaults)
 */
async function setAllPlayersInRegion(region, price) {
  const result = await pool.query(
    `UPDATE players 
     SET current_price = $1
     FROM teams 
     WHERE players.team_id = teams.id AND teams.region = $2
     RETURNING players.id`,
    [price, region]
  );
  
  console.log(`✅ Set ${result.rowCount} players in ${region} to $${price.toLocaleString()}`);
  return result.rowCount;
}

/**
 * Set all teams in region to same price
 */
async function setAllTeamsInRegion(region, price) {
  const result = await pool.query(
    'UPDATE teams SET current_price = $1 WHERE region = $2 RETURNING id',
    [price, region]
  );
  
  console.log(`✅ Set ${result.rowCount} teams in ${region} to $${price.toLocaleString()}`);
  return result.rowCount;
}

// ============================================================================
// EXAMPLE USAGE
// ============================================================================

async function main() {
  try {
    console.log('\n🚀 Manual Price Setter\n');

    // EXAMPLE 1: Set individual player price by ID
    // await setPlayerPrice(1, 450000);

    // EXAMPLE 2: Set individual team price by ID
    // await setTeamPrice(1, 500000);

    // EXAMPLE 3: Find player and set price
    // const player = await findPlayer('Tangyuan', 'LPL');
    // if (player) {
    //   await setPlayerPrice(player.id, 400000);
    // }

    // EXAMPLE 4: Bulk set multiple players
    // await bulkSetPlayerPrices([
    //   { playerId: 1, price: 500000 },
    //   { playerId: 2, price: 450000 },
    //   { playerId: 3, price: 400000 },
    // ]);

    // EXAMPLE 5: Set all LPL players to default price
    // await setAllPlayersInRegion('LPL', 300000);

    // EXAMPLE 6: Set all LPL teams to default price
    // await setAllTeamsInRegion('LPL', 350000);

    // EXAMPLE 7: List all current prices
    await listAllPrices();  // All regions
    // await listAllPrices('LPL');  // Specific region

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { 
  setPlayerPrice,
  setTeamPrice,
  bulkSetPlayerPrices,
  bulkSetTeamPrices,
  findPlayer,
  findTeam,
  listAllPrices,
  setAllPlayersInRegion,
  setAllTeamsInRegion
};
