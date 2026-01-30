import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';

// Test the games that are failing
const failingGames = [
  'LPL/2026 Season/Split 1_Week 3_10_2',
  'LPL/2026 Season/Split 1_Week 3_10_1',
  'LPL/2026 Season/Split 1_Week 3_9_2',
  'LPL/2026 Season/Split 1_Week 3_9_1'
];

async function testGame(gameId) {
  console.log(`\nTesting: ${gameId}`);
  
  const params = {
    action: 'cargoquery',
    format: 'json',
    tables: 'ScoreboardPlayers',
    fields: 'GameId, Link',
    where: `GameId="${gameId}"`,
    limit: 10
  };
  
  try {
    const response = await axios.get(url, { params, timeout: 30000 });
    
    if (response.data.cargoquery && response.data.cargoquery.length > 0) {
      console.log(`  ✅ Found ${response.data.cargoquery.length} players`);
    } else if (response.data.error) {
      console.log(`  ❌ API Error:`, response.data.error);
    } else {
      console.log(`  ⚠️  No data found (empty cargoquery)`);
    }
  } catch (error) {
    console.log(`  ❌ Request failed:`, error.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function main() {
  console.log('Testing failing games from backfill...\n');
  
  for (const gameId of failingGames) {
    await testGame(gameId);
  }
  
  console.log('\n✅ Test complete');
}

main();
