import { pool } from './src/config/database.js';

console.log('💰 Setting all players and teams to $400,000...\n');

async function setAllTo400k() {
  try {
    // Set all players to $400k
    const playersResult = await pool.query(
      'UPDATE players SET current_price = 400000 RETURNING id'
    );
    
    console.log(`✅ Set ${playersResult.rowCount} players to $400,000`);

    // Set all teams to $400k
    const teamsResult = await pool.query(
      'UPDATE teams SET current_price = 400000 RETURNING id'
    );
    
    console.log(`✅ Set ${teamsResult.rowCount} teams to $400,000`);

    // Verify
    const verification = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM players WHERE current_price = 400000) as players_at_400k,
        (SELECT COUNT(*) FROM teams WHERE current_price = 400000) as teams_at_400k,
        (SELECT COUNT(*) FROM players) as total_players,
        (SELECT COUNT(*) FROM teams) as total_teams`
    );

    const stats = verification.rows[0];
    
    console.log('\n📊 VERIFICATION:');
    console.log(`Players: ${stats.players_at_400k}/${stats.total_players} at $400,000`);
    console.log(`Teams: ${stats.teams_at_400k}/${stats.total_teams} at $400,000`);
    
    console.log('\n✅ All prices set to $400,000!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAllTo400k();
