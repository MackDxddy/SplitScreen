import { pool } from './src/config/database.js';

console.log('🔍 Checking current salary cap setup...\n');

async function checkSetup() {
  try {
    // Check players with prices
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
       WHERE p.current_price > 0
       ORDER BY p.current_price DESC
       LIMIT 10`
    );

    console.log('📊 TOP 10 PLAYERS WITH PRICES:');
    console.log('='.repeat(90));
    if (playersResult.rows.length === 0) {
      console.log('❌ NO PLAYERS HAVE PRICES SET YET\n');
      console.log('You need to run: node set-player-team-ranks.js');
      console.log('And set player ranks to assign prices.\n');
    } else {
      playersResult.rows.forEach(p => {
        console.log(`${p.ign} (${p.team} ${p.role}) - Rank ${p.rank_in_role} = $${p.current_price.toLocaleString()}`);
      });
    }

    // Check teams with prices
    const teamsResult = await pool.query(
      `SELECT 
        id,
        name,
        region,
        rank_in_region,
        current_price
       FROM teams
       WHERE current_price > 0
       ORDER BY current_price DESC
       LIMIT 10`
    );

    console.log('\n📊 TOP 10 TEAMS WITH PRICES:');
    console.log('='.repeat(70));
    if (teamsResult.rows.length === 0) {
      console.log('❌ NO TEAMS HAVE PRICES SET YET\n');
    } else {
      teamsResult.rows.forEach(t => {
        console.log(`${t.name} (${t.region}) - Rank ${t.rank_in_region} = $${t.current_price.toLocaleString()}`);
      });
    }

    // Check salary cap config
    const configResult = await pool.query('SELECT * FROM salary_cap_config ORDER BY region');
    
    console.log('\n💰 SALARY CAP CONFIG:');
    console.log('='.repeat(70));
    configResult.rows.forEach(c => {
      console.log(`${c.region}: ${c.total_teams} teams, $${c.min_price.toLocaleString()} - $${c.max_price.toLocaleString()}`);
    });

    console.log('\n✅ Setup check complete!');
    
    if (playersResult.rows.length === 0) {
      console.log('\n📝 NEXT STEP: Set player and team ranks using set-player-team-ranks.js');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
