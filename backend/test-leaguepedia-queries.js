import axios from 'axios';

const LEAGUEPEDIA_API = 'https://lol.fandom.com/api.php';

/**
 * Test different Leaguepedia queries to find teams and players
 */

async function testQuery(description, params) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${description}`);
  console.log('Params:', JSON.stringify(params, null, 2));
  
  try {
    const response = await axios.get(LEAGUEPEDIA_API, { params });
    
    if (response.data?.cargoquery) {
      console.log(`✅ Success! Found ${response.data.cargoquery.length} results`);
      console.log('\nFirst 3 results:');
      response.data.cargoquery.slice(0, 3).forEach((item, i) => {
        console.log(`\n${i + 1}.`, JSON.stringify(item.title, null, 2));
      });
    } else {
      console.log('❌ No cargoquery in response');
      console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 500));
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🔍 Testing Leaguepedia API Queries\n');

  // Test 1: Teams table - current LCS teams
  await testQuery('Teams table - LCS 2026', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Teams',
    fields: 'Name, Short, Region',
    where: 'Region="LCS"',
    limit: 10
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Try TournamentRosters for current split
  await testQuery('TournamentRosters - LCS 2026 Split 1', {
    action: 'cargoquery',
    format: 'json',
    tables: 'TournamentRosters',
    fields: 'Team, Player, Role, OverviewPage',
    where: 'OverviewPage LIKE "LCS/2026%"',
    limit: 20
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Try ScoreboardPlayers from a recent game
  await testQuery('ScoreboardPlayers - Recent LPL game', {
    action: 'cargoquery',
    format: 'json',
    tables: 'ScoreboardPlayers',
    fields: 'Link, Team, Role, Champion',
    where: 'OverviewPage="LPL/2026 Season/Split 1"',
    limit: 20
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 4: Try Players table
  await testQuery('Players table - Any players', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Players',
    fields: 'Player, Team, Role, Region',
    where: 'Region="LCS"',
    limit: 10
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 5: Try Tournaments to see what's available
  await testQuery('Tournaments - 2026 events', {
    action: 'cargoquery',
    format: 'json',
    tables: 'Tournaments',
    fields: 'Name, Region, League, DateStart',
    where: 'DateStart LIKE "2026%"',
    limit: 10
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 6: Try getting teams from ScoreboardGames
  await testQuery('Teams from ScoreboardGames - LPL', {
    action: 'cargoquery',
    format: 'json',
    tables: 'ScoreboardGames',
    fields: 'Team1, Team2, OverviewPage',
    where: 'OverviewPage="LPL/2026 Season/Split 1"',
    limit: 20
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test complete! Check results above to see what works.');
  process.exit(0);
}

main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
