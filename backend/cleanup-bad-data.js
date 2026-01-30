import { pool } from './src/config/database.js';

async function cleanupBadData() {
  try {
    console.log('🧹 Starting database cleanup...\n');

    // Delete player_stats first (foreign key dependency)
    const stats = await pool.query('DELETE FROM player_stats');
    console.log(`✅ Deleted ${stats.rowCount} player_stats records`);

    // Delete players (they all have null team_id)
    const players = await pool.query('DELETE FROM players');
    console.log(`✅ Deleted ${players.rowCount} players`);

    // Delete teams with Unknown region (keep the pre-seeded ones)
    const teams = await pool.query(`DELETE FROM teams WHERE region = 'Unknown'`);
    console.log(`✅ Deleted ${teams.rowCount} teams with region='Unknown'`);

    // Delete matches (so they can be re-processed with correct data)
    const matches = await pool.query('DELETE FROM matches');
    console.log(`✅ Deleted ${matches.rowCount} matches`);

    console.log('\n🎉 Cleanup complete! Restart your server to re-process games.\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

cleanupBadData();
