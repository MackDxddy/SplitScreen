import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';
const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardGames',
  fields: 'GameId, Tournament, DateTime_UTC, Team1, Team2, Winner, Gamelength, OverviewPage, Team1Score, Team2Score, Patch',
  where: 'OverviewPage="LPL/2026 Season/Split 1"',
  order_by: 'DateTime_UTC DESC',
  limit: 100
};

try {
  console.log('Querying Leaguepedia API...\n');
  const response = await axios.get(url, { params, timeout: 30000 });
  
  console.log('Status:', response.status);
  console.log('Has cargoquery:', !!response.data.cargoquery);
  console.log('Results count:', response.data.cargoquery?.length || 0);
  console.log('\nFirst 3 games:');
  console.log(JSON.stringify(response.data.cargoquery?.slice(0, 3), null, 2));
} catch (error) {
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Data:', JSON.stringify(error.response.data, null, 2));
  }
}
