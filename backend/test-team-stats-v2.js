import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';

// Try with the exact fields from ScoreboardTeams documentation
const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardTeams',
  fields: 'GameId, Team, Dragons, Barons, Towers, Kills, RiftHeralds, Inhibitors',
  where: 'GameId="LPL/2026 Season/Split 1_Week 3_10_3"',
  limit: 2
};

try {
  console.log('Testing ScoreboardTeams with correct fields...\n');
  const response = await axios.get(url, { params, timeout: 30000 });
  
  console.log('Status:', response.status);
  console.log('Has cargoquery:', !!response.data.cargoquery);
  
  if (response.data.cargoquery) {
    console.log('Results count:', response.data.cargoquery.length);
    console.log('\nData:', JSON.stringify(response.data, null, 2));
  } else if (response.data.error) {
    console.log('\nError:', JSON.stringify(response.data.error, null, 2));
  }
} catch (error) {
  console.error('Error:', error.message);
}
