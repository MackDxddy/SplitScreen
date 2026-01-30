import { pool } from './src/config/database.js';

async function checkTabColumn() {
  try {
    console.log('🔍 Checking tab column for week information...\n');

    // Check if tab column exists
    const columnCheck = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'matches' AND column_name = 'tab'`
    );

    if (columnCheck.rows.length === 0) {
      console.log('❌ Tab column does not exist in matches table');
      console.log('We need to add it to the schema first.\n');
      process.exit(0);
    }

    console.log('✅ Tab column exists\n');

    // Get sample games with tab data
    const result = await pool.query(
      `SELECT 
        id,
        external_game_id,
        tournament,
        tab,
        region,
        match_date,
        week
       FROM matches
       WHERE tab IS NOT NULL
       ORDER BY id DESC
       LIMIT 10`
    );

    if (result.rows.length === 0) {
      console.log('⚠️  No games found with tab data');
      console.log('Tab column exists but is empty/null for all games\n');
      process.exit(0);
    }

    console.log(`📊 Found ${result.rows.length} games with tab data:\n`);
    console.log('='.repeat(100));
    console.log('ID'.padEnd(5) + 'Tab Value'.padEnd(25) + 'Current Week'.padEnd(15) + 'Tournament');
    console.log('-'.repeat(100));

    result.rows.forEach(game => {
      console.log(
        String(game.id).padEnd(5) +
        (game.tab || 'NULL').substring(0, 24).padEnd(25) +
        (game.week || 'NULL').toString().padEnd(15) +
        (game.tournament || 'NULL').substring(0, 40)
      );
    });

    // Show unique tab values
    const uniqueTabs = await pool.query(
      `SELECT DISTINCT tab, COUNT(*) as count
       FROM matches
       WHERE tab IS NOT NULL
       GROUP BY tab
       ORDER BY count DESC`
    );

    console.log('\n\n📋 Unique tab values:');
    console.log('='.repeat(60));
    uniqueTabs.rows.forEach(t => {
      console.log(`"${t.tab}" - ${t.count} games`);
    });

    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTabColumn();
