import axios from 'axios';

const url = 'https://lol.fandom.com/api.php';

// Check what games exist for Week 1
const params = {
  action: 'cargoquery',
  format: 'json',
  tables: 'ScoreboardGames',
  fields: 'GameId, DateTime_UTC, Team1, Team2',
  where: 'OverviewPage="LPL/2026 Season/Split 1" AND GameId LIKE "%Week 1%"',
  order_by: 'DateTime_UTC ASC',
  limit: 10
};

try {
  console.log('Checking for Week 1 games in Leaguepedia...\n');
  const response = await axios.get(url, { params, timeout: 30000 });
  
  if (response.data.cargoquery && response.data.cargoquery.length > 0) {
    console.log(`Found ${response.data.cargoquery.length} Week 1 games:\n`);
    response.data.cargoquery.forEach((game, i) => {
      console.log(`${i + 1}. ${game.title.GameId}`);
      console.log(`   ${game.title.Team1} vs ${game.title.Team2}`);
      console.log(`   Date: ${game.title['DateTime UTC'] || 'No timestamp'}\n`);
    });
  } else {
    console.log('❌ No Week 1 games found in Leaguepedia');
    console.log('This means Week 1 stats have NOT been entered yet.\n');
  }
} catch (error) {
  console.error('Error:', error.message);
}
