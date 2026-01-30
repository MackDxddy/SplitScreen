import { pool } from './src/config/database.js';

async function checkData() {
  try {
    console.log('\n=== MATCHES ===');
    const matches = await pool.query(`
      SELECT id, external_id, region, tournament, match_date, status 
      FROM matches 
      ORDER BY id DESC 
      LIMIT 10
    `);
    console.table(matches.rows);

    console.log('\n=== PLAYERS ===');
    const players = await pool.query(`
      SELECT id, ign, team_id, role_id 
      FROM players 
      ORDER BY id DESC 
      LIMIT 20
    `);
    console.table(players.rows);

    console.log('\n=== PLAYER STATS WITH POINTS ===');
    const stats = await pool.query(`
      SELECT 
        ps.match_id,
        p.ign as player_name,
        ps.kills,
        ps.deaths,
        ps.assists,
        ps.cs,
        ps.vision_score,
        ps.fantasy_points
      FROM player_stats ps
      JOIN players p ON ps.player_id = p.id
      ORDER BY ps.match_id DESC, ps.fantasy_points DESC
      LIMIT 20
    `);
    console.table(stats.rows);

    console.log('\n=== TEAMS ===');
    const teams = await pool.query(`
      SELECT id, name, region
      FROM teams
      ORDER BY id DESC
    `);
    console.table(teams.rows);

    console.log('\n✅ Data check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkData();
