import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';

// Test ScoreboardPlayers for Week 1 Game 1
console.log('Testing ScoreboardPlayers for Week 1 game...\n');

const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardPlayers',
  fields: 'GameId, Link, Team, Role, Champion, Kills, Deaths, Assists, Gold, CS, DamageToChampions, VisionScore',
  where: 'GameId="LPL/2026 Season/Split 1_Week 1_1_1"',
  limit: 10
};

try {
  const response = await axios.get(url, { params, timeout: 30000 });
  
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  if (response.data.error) {
    console.log('\n❌ ERROR RETURNED:', response.data.error);
  }
  
  if (response.data.cargoquery) {
    console.log('\n✅ Found', response.data.cargoquery.length, 'players');
  }
} catch (error) {
  console.error('Request failed:', error.message);
  if (error.response) {
    console.error('Response data:', JSON.stringify(error.response.data, null, 2));
  }
}
