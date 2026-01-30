import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';
const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardTeams',
  fields: 'GameId, Team, Dragons, RiftHerald, Barons, Towers, Inhibitors, TeamKills',
  where: 'GameId="LPL/2026 Season/Split 1_Week 3_10_3"',
  limit: 2
};

try {
  console.log('Testing ScoreboardTeams query...\n');
  const response = await axios.get(url, { params, timeout: 30000 });
  
  console.log('Status:', response.status);
  console.log('Has cargoquery:', !!response.data.cargoquery);
  console.log('Results:', JSON.stringify(response.data, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
  }
}
