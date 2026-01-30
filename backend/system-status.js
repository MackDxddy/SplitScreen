import { pool } from './src/config/database.js';
import fs from 'fs';

console.log('🔍 SPLITSCREEN SYSTEM STATUS CHECK\n');
console.log('=' .repeat(60));

async function checkStatus() {
  try {
    // 1. DATABASE SCHEMA
    console.log('\n📊 DATABASE SCHEMA:');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
    
    // Check for week column
    const weekColumn = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'matches' AND column_name IN ('tab', 'week')
    `);
    console.log('Week tracking columns:', weekColumn.rows);

    // 2. DATA COUNTS
    console.log('\n📈 DATA COUNTS:');
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM matches) as matches,
        (SELECT COUNT(*) FROM players) as players,
        (SELECT COUNT(*) FROM teams) as teams,
        (SELECT COUNT(*) FROM player_stats) as player_stats,
        (SELECT COUNT(*) FROM team_stats) as team_stats
    `);
    console.log(counts.rows[0]);

    // 3. WEEK DATA
    console.log('\n📅 WEEK TRACKING:');
    const weekData = await pool.query(`
      SELECT 
        week,
        COUNT(*) as games,
        COUNT(CASE WHEN tab IS NOT NULL THEN 1 END) as games_with_tab
      FROM matches 
      GROUP BY week 
      ORDER BY week
    `);
    console.log('Games by week:', weekData.rows);

    // 4. MATCH TIMESTAMPS
    console.log('\n⏰ MATCH TIMESTAMPS:');
    const timestamps = await pool.query(`
      SELECT 
        COUNT(*) as total_matches,
        COUNT(CASE WHEN match_date IS NOT NULL THEN 1 END) as with_timestamps,
        COUNT(CASE WHEN match_date IS NULL THEN 1 END) as without_timestamps
      FROM matches
    `);
    console.log(timestamps.rows[0]);

    // 5. PLAYER/TEAM STATS COVERAGE
    console.log('\n🎮 STATS COVERAGE:');
    const coverage = await pool.query(`
      SELECT 
        m.id,
        m.external_id,
        (SELECT COUNT(*) FROM player_stats WHERE match_id = m.id) as players,
        (SELECT COUNT(*) FROM team_stats WHERE match_id = m.id) as teams
      FROM matches m
      ORDER BY m.id DESC
      LIMIT 10
    `);
    console.log('Last 10 matches:');
    coverage.rows.forEach(r => {
      console.log(`  Match ${r.id}: ${r.players} players, ${r.teams} teams - ${r.external_id}`);
    });

    // 6. DEPLOYED FILES
    console.log('\n📁 KEY FILES:');
    const files = [
      'src/services/leaguepedia.service.js',
      'src/services/data-pipeline.service.js', 
      'src/jobs/continuous-game-poller.job.js'
    ];
    
    for (const file of files) {
      const exists = fs.existsSync(file);
      const stats = exists ? fs.statSync(file) : null;
      console.log(`  ${exists ? '✅' : '❌'} ${file} ${stats ? `(${stats.size} bytes, modified ${stats.mtime.toISOString()})` : ''}`);
    }

    // 7. PRICING
    console.log('\n💰 PRICING:');
    const pricing = await pool.query(`
      SELECT 
        MIN(current_price) as min_price,
        MAX(current_price) as max_price,
        AVG(current_price) as avg_price,
        COUNT(CASE WHEN current_price = 400000 THEN 1 END) as at_400k
      FROM players
    `);
    console.log('Players:', pricing.rows[0]);
    
    const teamPricing = await pool.query(`
      SELECT 
        MIN(current_price) as min_price,
        MAX(current_price) as max_price,
        AVG(current_price) as avg_price,
        COUNT(CASE WHEN current_price = 400000 THEN 1 END) as at_400k
      FROM teams
    `);
    console.log('Teams:', teamPricing.rows[0]);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Status check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkStatus();
