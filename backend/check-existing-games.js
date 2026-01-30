import { pool } from './src/config/database.js';

async function checkExistingGames() {
  try {
    console.log('🔍 Checking existing games in database...\n');

    const result = await pool.query(
      `SELECT 
        id,
        external_game_id,
        tournament,
        region,
        match_date,
        week,
        blue_team,
        red_team
       FROM matches
       ORDER BY match_date DESC NULLS LAST
       LIMIT 10`
    );

    console.log(`📊 Found ${result.rowCount} total matches\n`);
    console.log('Sample games:');
    console.log('='.repeat(100));
    console.log('ID'.padEnd(5) + 'External ID'.padEnd(30) + 'Tournament'.padEnd(35) + 'Week'.padEnd(6) + 'Date');
    console.log('-'.repeat(100));

    result.rows.forEach(game => {
      console.log(
        String(game.id).padEnd(5) +
        (game.external_game_id || 'NULL').substring(0, 29).padEnd(30) +
        (game.tournament || 'NULL').substring(0, 34).padEnd(35) +
        (game.week || 'NULL').toString().padEnd(6) +
        (game.match_date ? new Date(game.match_date).toISOString().split('T')[0] : 'NULL')
      );
    });

    // Check tournament format
    const tournamentFormats = await pool.query(
      `SELECT DISTINCT tournament, region, COUNT(*) as game_count
       FROM matches
       GROUP BY tournament, region
       ORDER BY game_count DESC`
    );

    console.log('\n\n📋 Tournament formats in database:');
    console.log('='.repeat(80));
    tournamentFormats.rows.forEach(t => {
      console.log(`${t.tournament || 'NULL'} (${t.region}) - ${t.game_count} games`);
    });

    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkExistingGames();
