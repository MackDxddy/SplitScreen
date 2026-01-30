import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';
const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardGames',
  fields: 'GameId, Tournament',
  where: 'OverviewPage="LPL/2026 Season/Split 1"',
  limit: 1
};

try {
  const response = await axios.get(url, { params });
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(response.data, null, 2));
} catch (error) {
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Response:', JSON.stringify(error.response.data, null, 2));
  }
}
